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
    // A socket can fail just after a response has completed.
    socket.on("error", () => {});
  }

  static async connect(config: EmailConfig): Promise<ImapConnection> {
    const socket = tls.connect({
      host: config.host,
      port: config.port,
      servername: config.host,
      rejectUnauthorized: true,
    });
    const connection = new ImapConnection(socket);
    try {
      await connection.waitFor("secureConnect", () => true, "TLS connection", 15_000);
      await connection.waitForResponse(/\r?\n/, "server greeting", 15_000);
      return connection;
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  private waitFor<T>(
    event: "secureConnect" | "data",
    read: () => T | undefined,
    stage: string,
    timeoutMs: number,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.socket.off(event, onReady);
        this.socket.off("error", onError);
        this.socket.off("close", onClose);
      };
      const onReady = () => {
        const value = read();
        if (value === undefined) return;
        cleanup();
        resolve(value);
      };
      const onError = (error: Error) => {
        cleanup();
        reject(new Error("IMAP " + stage + " failed: " + error.message, { cause: error }));
      };
      const onClose = () => onError(new Error("Server closed the connection."));
      const timer = setTimeout(() => {
        cleanup();
        this.socket.destroy();
        reject(new Error("IMAP " + stage + " timed out after " + timeoutMs / 1000 + " seconds."));
      }, timeoutMs);
      this.socket.on(event, onReady);
      this.socket.once("error", onError);
      this.socket.once("close", onClose);
      if (this.socket.destroyed) onClose();
      else if (event === "data") onReady();
    });
  }

  private waitForResponse(pattern: RegExp, stage: string, timeoutMs: number): Promise<string> {
    return this.waitFor("data", () => {
      const match = this.buffer.match(pattern);
      if (match?.index === undefined) return undefined;
      const end = match.index + match[0].length;
      const result = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end);
      return result;
    }, stage, timeoutMs);
  }

  async command(command: string): Promise<string> {
    const tag = "A" + String(++this.tag).padStart(4, "0");
    const stage = command.split(" ", command.startsWith("UID ") ? 2 : 1).join(" ");
    const response = this.waitForResponse(new RegExp("(?:^|\\r?\\n)" + tag + " (?:OK|NO|BAD).*\\r?\\n", "i"), stage, 30_000);
    if (!this.socket.destroyed) this.socket.write(tag + " " + command + "\r\n");
    const raw = await response;
    const finalLine = raw.trim().split(/\r?\n/).at(-1) || "";
    if (!new RegExp("^" + tag + " OK", "i").test(finalLine)) {
      throw new Error("IMAP command failed: " + finalLine.replace(tag, "").trim());
    }
    return raw;
  }

  close(): void {
    this.socket.destroy();
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
  return searchMailbox([clean], limit);
}

export async function searchContractEmails(limit = 20): Promise<EmailSearchResult[]> {
  return searchMailbox(["kontrakt", "avtale"], limit);
}

async function searchMailbox(queries: string[], limit: number): Promise<EmailSearchResult[]> {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  return withMailbox(async (client) => {
    const uids = new Set<number>();
    for (const query of queries) {
      const result = await client.command("UID SEARCH TEXT " + quote(query));
      const line = result.match(/^\* SEARCH(?: ([^\r\n]*))?$/im)?.[1] || "";
      const matches = line.split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite);
      for (const uid of matches.slice(-safeLimit).reverse()) uids.add(uid);
    }

    const messages: EmailSearchResult[] = [];
    for (const uid of uids) {
      const raw = await client.command(
        "UID FETCH " + uid + " (BODY.PEEK[HEADER.FIELDS (DATE FROM TO SUBJECT MESSAGE-ID)] BODY.PEEK[TEXT]<0.16384>)",
      );
      messages.push(parseFetch(uid, raw));
    }
    return messages;
  });
}
