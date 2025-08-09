import { describe, it, expect } from "vitest";
import { sanitizeIdea, type IdeaRow } from "./sanitize";

const row: IdeaRow = {
  id: "id1",
  owner_id: "user1",
  title: "Great Idea",
  description: "A brilliant concept.",
  idea_hash: "abc123",
  visibility: "public",
  status: "draft",
  score: 55,
  analysis_summary: "summary",
  analysis_raw: "raw-json",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("sanitizeIdea", () => {
  it("includes sensitive fields for owner", () => {
    const s = sanitizeIdea(row, "user1");
    expect(s.owner_id).toBe("user1");
    expect(s.idea_hash).toBe("abc123");
    expect(s.analysis_raw).toBe("raw-json");
    expect(s.owner_anon).toBe(false);
  });

  it("omits sensitive fields for other viewers", () => {
    const s = sanitizeIdea(row, "someone-else");
    expect(s.owner_id).toBeUndefined();
    expect(s.idea_hash).toBeUndefined();
    expect(s.analysis_raw).toBeUndefined();
    expect(s.owner_anon).toBe(true);
  });

  it("omits sensitive fields when unauthenticated", () => {
    const s = sanitizeIdea(row, null);
    expect(s.owner_id).toBeUndefined();
    expect(s.idea_hash).toBeUndefined();
    expect(s.analysis_raw).toBeUndefined();
    expect(s.owner_anon).toBe(true);
  });
});

