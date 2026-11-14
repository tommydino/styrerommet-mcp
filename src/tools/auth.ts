import { CREATE_ANNOTATIONS } from "../annotations.ts";
import type { McpServer } from "@modelcontextprotocol/server";
import { runInteractiveLogin } from "../auth/login.ts";
import { z } from "zod";

export function registerAuthTools(server: McpServer): void {
  server.registerTool(
    "login_interactive",
    {
      description:
        "Launch a browser to log into Styrerommet, Arkiv and Vibbo. Standard is the default and never opens Mitt Bygg. Select mittbygg only for cooperatives that use OBOS Mitt Bygg.",
      inputSchema: z.object({
        service: z
          .enum(["standard", "mittbygg"])
          .optional()
          .default("standard")
          .describe("standard signs in to Styrerommet, Arkiv and Vibbo; mittbygg is a separate optional sign-in."),
      }),
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
