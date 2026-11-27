import test from "node:test";
import assert from "node:assert/strict";
import { McpServer } from "@modelcontextprotocol/server";
import { registerNewsDraftTools } from "./news-drafts.ts";
import { reloadVibboTokens } from "../vibbo-client.ts";

const originalSlug = process.env.VIBBO_ORG_SLUG;
const originalCookie = process.env.VIBBO_COOKIE;

test.after(() => {
  if (originalSlug === undefined) delete process.env.VIBBO_ORG_SLUG;
  else process.env.VIBBO_ORG_SLUG = originalSlug;
  if (originalCookie === undefined) delete process.env.VIBBO_COOKIE;
  else process.env.VIBBO_COOKIE = originalCookie;
  reloadVibboTokens();
});

test("vibbo_create_news_draft creates an unpublished shell and saves its title as a revision", async () => {
  const originalFetch = globalThis.fetch;
  process.env.VIBBO_ORG_SLUG = "example-coop";
  process.env.VIBBO_COOKIE = "mock-cookie";
  reloadVibboTokens();

  const calls: Array<{ operationName: string; variables: any }> = [];

  try {
    globalThis.fetch = (async (_url: any, init: any) => {
      const body = JSON.parse(init?.body || "{}");
      calls.push({
        operationName: body.operationName,
        variables: body.variables,
      });

      let data;
      if (body.operationName === "getVibboOrgNodeId") {
        data = { organization: { id: "Organization:123" } };
      } else if (body.operationName === "createNews") {
        assert.match(
          body.variables.input.dateFrom,
          /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/,
        );
        assert.deepEqual(
          { ...body.variables.input, dateFrom: "<timestamp>" },
          {
            organizationId: "Organization:123",
            authorOrganizationId: "Organization:123",
            dateFrom: "<timestamp>",
            dateTo: null,
            title: "",
            topicIds: [],
          },
        );
        assert.equal(init.headers["x-version"], "931");
        data = {
          createNews: {
            id: "News:456",
            slug: "2026-11-27-test",
            isPublished: false,
            organization: { id: "Organization:123" },
          },
        };
      } else if (body.operationName === "saveEntityRevision") {
        assert.equal(body.variables.input.organizationId, "Organization:123");
        assert.equal(body.variables.input.relatedNodeId, "News:456");
        assert.equal(body.variables.input.content.meta.title, "test");
        assert.equal(body.variables.input.content.meta.ingress, "");
        data = {
          saveEntityRevision: {
            id: "Revision:789",
            updatedAt: "2026-11-27T20:00:00Z",
            content: body.variables.input.content,
          },
        };
      } else {
        throw new Error(`Unexpected operation: ${body.operationName}`);
      }

      return {
        ok: true,
        status: 200,
        statusText: "OK",
        redirected: false,
        url: "https://vibbo.no/graphql",
        json: async () => ({ data }),
        text: async () => JSON.stringify({ data }),
      } as any;
    }) as typeof fetch;

    const server = new McpServer({ name: "test", version: "1.0.0" });
    registerNewsDraftTools(server);
    const tool = (server as any)._registeredTools["vibbo_create_news_draft"];
    assert.ok(tool);

    const result = await tool.handler({ title: "  test  " });
    const parsed = JSON.parse(result.content[0].text);

    assert.equal(parsed.success, true);
    assert.equal(parsed.news.title, "test");
    assert.equal(parsed.news.isPublished, false);
    assert.equal(parsed.news.revisionId, "Revision:789");
    assert.deepEqual(
      calls.map((call) => call.operationName),
      ["getVibboOrgNodeId", "createNews", "saveEntityRevision"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("vibbo_create_news_draft does not save a revision when creation is not confirmed unpublished", async () => {
  const originalFetch = globalThis.fetch;
  process.env.VIBBO_ORG_SLUG = "example-coop";
  process.env.VIBBO_COOKIE = "mock-cookie";
  reloadVibboTokens();

  let saveCalls = 0;
  try {
    globalThis.fetch = (async (_url: any, init: any) => {
      const body = JSON.parse(init?.body || "{}");
      if (body.operationName === "getVibboOrgNodeId") {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          redirected: false,
          url: "https://vibbo.no/graphql",
          json: async () => ({
            data: { organization: { id: "Organization:123" } },
          }),
        } as any;
      }
      if (body.operationName === "createNews") {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          redirected: false,
          url: "https://vibbo.no/graphql",
          json: async () => ({
            data: {
              createNews: {
                id: "News:published",
                slug: "published",
                isPublished: true,
                organization: { id: "Organization:123" },
              },
            },
          }),
        } as any;
      }
      if (body.operationName === "saveEntityRevision") saveCalls++;
      throw new Error(`Unexpected operation: ${body.operationName}`);
    }) as typeof fetch;

    const server = new McpServer({ name: "test", version: "1.0.0" });
    registerNewsDraftTools(server);
    const tool = (server as any)._registeredTools["vibbo_create_news_draft"];

    await assert.rejects(
      () => tool.handler({ title: "test" }),
      /not confirmed unpublished/,
    );
    assert.equal(saveCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
