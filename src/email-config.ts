import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const execFileAsync = promisify(execFile);
const KEYCHAIN_SERVICE = "styrerommet-plus-email";
const CONFIG_PATH = join(homedir(), ".config", "styrerommet-plus", "email.json");

export interface EmailConfig {
  email: string;
  host: string;
  port: number;
  secure: boolean;
  mailbox: string;
}

export function emailConfigPath(): string {
  return CONFIG_PATH;
}

export async function loadEmailConfig(): Promise<EmailConfig | null> {
  try {
    const value = JSON.parse(await readFile(CONFIG_PATH, "utf8")) as Partial<EmailConfig>;
    if (!value.email) return null;
    return {
      email: value.email,
      host: value.host || "imap.styrerommet.no",
      port: value.port || 993,
      secure: value.secure !== false,
      mailbox: value.mailbox || "INBOX",
    };
  } catch {
    return null;
  }
}

async function savePassword(email: string, password: string): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("Secure email setup currently requires macOS Keychain. You may alternatively set STYREROMMET_EMAIL_PASSWORD for this process.");
  }
  await execFileAsync("security", [
    "add-generic-password", "-U", "-a", email, "-s", KEYCHAIN_SERVICE, "-w", password,
  ]);
}

export async function getEmailPassword(email: string): Promise<string> {
  if (process.env.STYREROMMET_EMAIL_PASSWORD) return process.env.STYREROMMET_EMAIL_PASSWORD;
  if (process.platform !== "darwin") {
    throw new Error("Email password is not available. Set STYREROMMET_EMAIL_PASSWORD or run on macOS with Keychain.");
  }
  try {
    const { stdout } = await execFileAsync("security", [
      "find-generic-password", "-a", email, "-s", KEYCHAIN_SERVICE, "-w",
    ]);
    return stdout.trim();
  } catch {
    throw new Error("No email password was found in macOS Keychain. Run styrerommet-plus --email-setup.");
  }
}

export async function setupEmail(): Promise<EmailConfig> {
  if (process.platform !== "darwin") {
    throw new Error("The interactive secure setup currently supports macOS Keychain.");
  }
  const rl = createInterface({ input, output });
  try {
    const email = (await rl.question("Styrerommet email address: ")).trim();
    if (!email || !email.includes("@")) throw new Error("A valid email address is required.");
    const password = await rl.question("Email password (stored only in macOS Keychain): ");
    if (!password) throw new Error("Password is required.");
    const host = (await rl.question("IMAP server [imap.styrerommet.no]: ")).trim() || "imap.styrerommet.no";
    const portText = (await rl.question("IMAP port [993]: ")).trim();
    const port = portText ? Number(portText) : 993;
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid IMAP port.");
    const config: EmailConfig = { email, host, port, secure: true, mailbox: "INBOX" };
    await savePassword(email, password);
    await mkdir(dirname(CONFIG_PATH), { recursive: true, mode: 0o700 });
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
    return config;
  } finally {
    rl.close();
  }
}

export async function removeEmailSetup(): Promise<void> {
  const config = await loadEmailConfig();
  if (config && process.platform === "darwin") {
    await execFileAsync("security", [
      "delete-generic-password", "-a", config.email, "-s", KEYCHAIN_SERVICE,
    ]).catch(() => undefined);
  }
  await rm(CONFIG_PATH, { force: true });
}
