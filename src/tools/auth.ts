import { CREATE_ANNOTATIONS } from "../annotations.ts";
import type { McpServer } from "@modelcontextprotocol/server";
import { runInteractiveLogin } from "../auth/login.ts";
import { z } from "zod";

export function registerAuthTools(server: McpServer): void {
  server.registerTool(
    "login_interactive",
    {
      description:
        "Launch a browser to log into Styrerommet, Arkiv and Vibbo. Mitt Bygg is optional and is only attempted when requested.",
      inputSchema: z.object({ service: z.enum(["standard", "mittbygg"]).optional().default("standard") }),
      annotations: CREATE_ANNOTATIONS,
    },
    async ({ service }) => {
      try {
        const result = await runInteractiveLogin(service);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `Interactive authentication failed: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
