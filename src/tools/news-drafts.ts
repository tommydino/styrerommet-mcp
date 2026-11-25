import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import { CREATE_ANNOTATIONS } from "../annotations.ts";
import {
  getVibboOrgNodeId,
  getVibboOrgSlug,
  vibboGraphqlQuery,
} from "../vibbo-client.ts";
import { buildVibboWebUrl } from "../urls.ts";

/**
 * This mutation creates an unpublished News entity. Deliberately no publish or
 * notification mutation is exposed by this tool.
 */
export const CREATE_NEWS_DRAFT_MUTATION = `mutation createNews($input: CreateNewsInput!) {
  createNews(input: $input) {
    id
    slug
    title
    isPublished
    organization { id }
  }
}`;

export function registerNewsDraftTools(server: McpServer): void {
  server.registerTool(
    "vibbo_create_news_draft",
    {
      description:
        "Create an unpublished Vibbo news draft for the signed-in cooperative. Does not publish, notify residents, or allow selecting another cooperative. Verify the returned draft with vibbo_get_news.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(200).describe("Title of the unpublished news draft"),
      }),
      annotations: CREATE_ANNOTATIONS,
    },
    async ({ title }) => {
      const cleanTitle = title.trim();
      const organizationId = await getVibboOrgNodeId();
      const organizationSlug = getVibboOrgSlug();
      const response = await vibboGraphqlQuery<{
        createNews?: {
          id: string;
          slug: string;
          title: string;
          isPublished: boolean;
          organization?: { id: string };
        };
      }>(
        "createNews",
        CREATE_NEWS_DRAFT_MUTATION,
        {
          input: {
            organizationId,
            authorOrganizationId: organizationId,
            title: cleanTitle,
          },
        },
        false,
      );
      const news = response.data?.createNews;
      if (response.errors?.length || !news?.id || !news.slug) {
        throw new Error(
          `News draft creation could not be confirmed: ${response.errors?.map((error) => error.message).join("; ") || "No news entity returned"}`,
        );
      }
      if (news.organization?.id !== organizationId || news.isPublished !== false) {
        throw new Error(
          `UNEXPECTED STATE: Created news ${news.id} is outside the signed-in cooperative or not confirmed unpublished. No further changes were made.`,
        );
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            news: {
              id: news.id,
              slug: news.slug,
              title: news.title,
              isPublished: false,
              webUrl: buildVibboWebUrl("nyheter", news.slug, organizationSlug),
            },
          }, null, 2),
        }],
      };
    },
  );
}
