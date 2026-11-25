import assert from "node:assert/strict";
import { test } from "node:test";
import { CREATE_NEWS_DRAFT_MUTATION } from "./news-drafts.ts";

test("news draft mutation never publishes or sends notifications", () => {
  assert.match(CREATE_NEWS_DRAFT_MUTATION, /mutation createNews\(/);
  assert.doesNotMatch(CREATE_NEWS_DRAFT_MUTATION, /publishNews|notifyResidents|sendNotification/i);
  assert.match(CREATE_NEWS_DRAFT_MUTATION, /isPublished/);
});
