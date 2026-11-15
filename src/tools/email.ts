import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import { READ_ONLY_ANNOTATIONS } from "../annotations.ts";
import { loadEmailConfig } from "../email-config.ts";
import { searchContractEmails, searchEmails, testEmailConnection } from "../email-client.ts";

function response(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export function registerEmailTools(server: McpServer): void {
  server.registerTool(
    "email_status",
    {
      description: "Check whether local Styrerommet email access is configured and whether the read-only IMAP connection works.",
      inputSchema: z.object({ testConnection: z.boolean().optional().default(false) }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ testConnection }) => {
      const config = await loadEmailConfig();
      if (!config) return response({ configured: false, setupCommand: "npx styrerommet-plus --email-setup" });
      if (testConnection) await testEmailConnection();
      return response({
        configured: true,
        email: config.email,
        host: config.host,
        port: config.port,
        mailbox: config.mailbox,
        connectionTested: testConnection,
      });
    },
  );

  server.registerTool(
    "search_emails",
    {
      description: "Search the signed-in Styrerommet mailbox by words appearing in sender, recipients, subject or message text. Read-only.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Words or phrase to find in the mailbox"),
        limit: z.number().int().min(1).max(50).optional().default(20),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query, limit }) => response({ query, messages: await searchEmails(query, limit) }),
  );

  server.registerTool(
    "search_email_contracts",
    {
      description: "Search Styrerommet email for contracts or agreements, optionally combined with supplier or project words. Read-only.",
      inputSchema: z.object({
        query: z.string().optional().default(""),
        limit: z.number().int().min(1).max(50).optional().default(20),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query, limit }) => {
      const messages = await searchContractEmails(limit);
      const extra = query.trim().toLocaleLowerCase("nb-NO");
      const matches = messages.filter((message) => {
        const searchable = [
          message.subject,
          message.from,
          message.to,
          message.preview,
        ].filter(Boolean).join(" ").toLocaleLowerCase("nb-NO");
        return !extra || searchable.includes(extra);
      });
      return response({
        query: query.trim() || undefined,
        messages: matches.slice(0, limit),
      });
    },
  );
}
