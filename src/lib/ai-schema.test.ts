import { describe, expect, it } from "vitest";
import { discoveryTurnSchema } from "./ai-schema";

const turn = { reply: "What subject?", change_summary: "Search screen proposed", current_question_answered: false, requirement_suggestions: [], ambiguities: [], next_question: null, screens: [], connections: [], scope_changes: [] };
describe("discovery safety", () => {
  it("rejects AI confirmation while accepting proposed requirements", () => {
    const suggestion = { category: "feature", title: "Book a tutor", description: "Book lessons", status: "proposed", evidence_quote: "book private tutors" };
    expect(discoveryTurnSchema.safeParse({ ...turn, requirement_suggestions: [suggestion] }).success).toBe(true);
    expect(discoveryTurnSchema.safeParse({ ...turn, requirement_suggestions: [{ ...suggestion, status: "confirmed" }] }).success).toBe(false);
  });
  it("rejects malformed sketches instead of persisting unsupported components", () => {
    expect(discoveryTurnSchema.safeParse({ ...turn, screens: [{ key: "search", name: "Search", purpose: "Find a tutor", user_role: "Parent", components: [{ type: "ai_image", label: "Photo", items: [] }], unresolved: [], change_note: "" }] }).success).toBe(false);
  });
});