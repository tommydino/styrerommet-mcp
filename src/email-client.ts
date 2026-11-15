import tls from "node:tls";
import { getEmailPassword, loadEmailConfig, type EmailConfig } from "./email-config.ts";

function quote(value: string): string {
  return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, " ") + '"';
}

class ImapConnection {
  private socket: tls.TLSSocket;
  private buffer = "";
  private tag = 0;

  private constructor(socket: tls.TLSSocket) {
    this.socket = socket;
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => { this.buffer += chunk; });
  }

  static async connect(config: EmailConfig): Promise<ImapConnection> {
    const socket = tls.connect({
      host: config.host,
      port: config.port,
      servername: config.host,
      rejectUnauthorized: true,
    });
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });
    const connection = new ImapConnection(socket);
    await connection.waitFor(/\r?\n/, 15_000);
    return connection;
  }

  private async waitFor(pattern: RegExp, timeoutMs: number): Promise<string> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const match = this.buffer.match(pattern);
      if (match?.index !== undefined) {
        const end = match.index + match[0].length;
        const result = this.buffer.slice(0, end);
        this.buffer = this.buffer.slice(end);
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("Timed out while waiting for the IMAP server.");
  }

  async command(command: string): Promise<string> {
    const tag = "A" + String(++this.tag).padStart(4, "0");
    this.socket.write(tag + " " + command + "\r\n");
    const raw = await this.waitFor(new RegExp("(?:^|\\r?\\n)" + tag + " (?:OK|NO|BAD).*\\r?\\n", "i"), 30_000);
    const finalLine = raw.trim().split(/\r?\n/).at(-1) || "";
    if (!new RegExp("^" + tag + " OK", "i").test(finalLine)) {
      throw new Error("IMAP command failed: " + finalLine.replace(tag, "").trim());
    }
    return raw;
  }

  close(): void {
    this.socket.write("ZZZZ LOGOUT\r\n");
    this.socket.end();
  }
}

export interface EmailSearchResult {
  uid: number;
  date: string | undefined;
  from: string | undefined;
  to: string | undefined;
  subject: string | undefined;
  messageId: string | undefined;
  preview: string;
}

function header(raw: string, name: string): string | undefined {
  const match = raw.match(new RegExp("^" + name + ":\\s*(.+(?:\\r?\\n[ \\t].+)*)", "im"));
  return match?.[1]?.replace(/\r?\n[ \t]+/g, " ").trim();
}

function parseFetch(uid: number, raw: string): EmailSearchResult {
  const headerEnd = raw.search(/\r?\n\r?\n/);
  const body = headerEnd >= 0 ? raw.slice(headerEnd).replace(/\r?\n\)\r?\nA\d+ OK[\s\S]*$/i, "") : "";
  return {
    uid,
    date: header(raw, "Date"),
    from: header(raw, "From"),
    to: header(raw, "To"),
    subject: header(raw, "Subject"),
    messageId: header(raw, "Message-ID"),
    preview: body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000),
  };
}

async function withMailbox<T>(fn: (client: ImapConnection, config: EmailConfig) => Promise<T>): Promise<T> {
  const config = await loadEmailConfig();
  if (!config) throw new Error("Email is not configured. Run styrerommet-plus --email-setup.");
  const password = await getEmailPassword(config.email);
  const client = await ImapConnection.connect(config);
  try {
    await client.command("LOGIN " + quote(config.email) + " " + quote(password));
    await client.command("EXAMINE " + quote(config.mailbox));
    return await fn(client, config);
  } finally {
    client.close();
  }
}

export async function testEmailConnection(): Promise<void> {
  await withMailbox(async () => undefined);
}

export async function searchEmails(query: string, limit = 20): Promise<EmailSearchResult[]> {
  const clean = query.trim();
  if (!clean) throw new Error("Search query cannot be empty.");
  const safeLimit = Math.max(1, Math.min(limit, 50));
  return withMailbox(async (client) => {
    const result = await client.command("UID SEARCH TEXT " + quote(clean));
    const line = result.match(/^\* SEARCH(?: (.*))?$/im)?.[1] || "";
    const uids = line.split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite).slice(-safeLimit).reverse();
    const messages: EmailSearchResult[] = [];
    for (const uid of uids) {
      const raw = await client.command(
        "UID FETCH " + uid + " (BODY.PEEK[HEADER.FIELDS (DATE FROM TO SUBJECT MESSAGE-ID)] BODY.PEEK[TEXT])",
      );
      messages.push(parseFetch(uid, raw));
    }
    return messages;
  });
}
