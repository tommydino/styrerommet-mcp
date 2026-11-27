import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import { CREATE_ANNOTATIONS } from "../annotations.ts";
import {
  getVibboOrgNodeId,
  getVibboOrgSlug,
  vibboGraphqlQuery,
} from "../vibbo-client.ts";
import { buildVibboWebUrl } from "../urls.ts";
import { composeDraftContent } from "./topics.ts";

/**
 * Vibbo creates an empty, unpublished News entity first. The editable title
 * belongs to its entity revision and must be saved separately.
 */
export const CREATE_NEWS_DRAFT_MUTATION = `mutation createNews($input: CreateNewsInput!) {
  createNews(input: $input) {
    id
    slug
    isPublished
    organization { id }
  }
}`;

export const SAVE_NEWS_DRAFT_MUTATION = `mutation saveEntityRevision($input: SaveEntityRevisionInput!) {
  saveEntityRevision(input: $input) {
    id
    updatedAt
    content
  }
}`;

export function registerNewsDraftTools(server: McpServer): void {
  server.registerTool(
    "vibbo_create_news_draft",
    {
      description:
        "Create an unpublished Vibbo news draft for the signed-in cooperative. Does not publish, notify residents, or allow selecting another cooperative. Verify the returned draft with vibbo_get_news.",
      inputSchema: z.object({
        title: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .describe("Title of the unpublished news draft"),
      }),
      annotations: CREATE_ANNOTATIONS,
    },
    async ({ title }) => {
      const cleanTitle = title.trim();
      const organizationId = await getVibboOrgNodeId();
      const organizationSlug = getVibboOrgSlug();

      // createNews only creates the empty draft shell. Passing editor fields
      // such as title in CreateNewsInput makes Vibbo reject the mutation.
      const createResponse = await vibboGraphqlQuery<{
        createNews?: {
          id: string;
          slug: string;
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
          },
        },
        false,
      );

      const news = createResponse.data?.createNews;
      if (createResponse.errors?.length || !news?.id || !news.slug) {
        throw new Error(
          `News draft creation could not be confirmed: ${createResponse.errors?.map((error) => error.message).join("; ") || "No news entity returned"}`,
        );
      }
      if (news.organization?.id !== organizationId || news.isPublished !== false) {
        throw new Error(
          `UNEXPECTED STATE: Created news ${news.id} is outside the signed-in cooperative or not confirmed unpublished. No further changes were made.`,
        );
      }

      const draftContent = composeDraftContent(cleanTitle);
      let revision;
      try {
        const revisionResponse = await vibboGraphqlQuery<{
          saveEntityRevision?: {
            id: string;
            updatedAt?: string;
            content?: {
              meta?: { title?: string };
            };
          };
        }>(
          "saveEntityRevision",
          SAVE_NEWS_DRAFT_MUTATION,
          {
            input: {
              organizationId,
              relatedNodeId: news.id,
              content: draftContent,
            },
          },
          false,
        );

        revision = revisionResponse.data?.saveEntityRevision;
        if (revisionResponse.errors?.length || !revision?.id) {
          throw new Error(
            revisionResponse.errors?.map((error) => error.message).join("; ") ||
              "No revision returned",
          );
        }
        if (
          revision.content?.meta?.title !== undefined &&
          revision.content.meta.title !== cleanTitle
        ) {
          throw new Error("The saved title differs from the requested title");
        }
      } catch (error) {
        throw new Error(
          `News draft '${news.slug}' (${news.id}) was created, but its title was not confirmed saved. Inspect the draft before retrying; no automatic deletion was attempted. ${String(error)}`,
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message:
                  "Unpublished news draft created. No residents were notified.",
                news: {
                  id: news.id,
                  slug: news.slug,
                  title: cleanTitle,
                  isPublished: false,
                  revisionId: revision.id,
                  webUrl: buildVibboWebUrl(
                    "nyheter",
                    news.slug,
                    organizationSlug,
                  ),
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
