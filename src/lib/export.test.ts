import { describe, expect, it } from "vitest";
import { buildExport, exportMarkdown } from "./export";
import type { Workspace } from "./queries";

const data: Workspace = {
  project: { id: "sample", name: "Private tutoring booking platform", summary: "Parents book vetted tutors", is_demo: true, owner_id: "owner", created_at: "2026-11-10T20:00:00Z", updated_at: "2026-11-10T21:00:00Z" },
  requirements: [], questions: [], screens: [], connections: [], decisions: [], versions: [], comments: [], scopeChanges: [], people: [], messages: [], meId: "owner", myRole: "owner", meetings: [],
};
describe("saved specification exports", () => {
  it("exports actual saved project data with a demo flag and no fabricated approval", () => {
    const doc = buildExport(data);
    expect(doc.project.name).toBe("Private tutoring booking platform");
    expect(doc.project.summary).toBe("Parents book vetted tutors");
    expect(doc.demo).toBe(true);
    expect(doc.approvals).toEqual([]);
    expect(doc.state).toBe("live_draft");
  });
  it("preserves saved screen and workflow descriptions in both structured and Markdown exports", () => {
    const withScreens: Workspace = { ...data, screens: [{ id: "find", key: "find", name: "Find tutor", purpose: "Search by subject", user_role: "Parent", components: [], unresolved: [], project_id: "sample", position: 0, created_at: "2026-11-10", updated_at: "2026-11-10", change_note: null, changed_message_id: null, layout_x: null, layout_y: null, layout_w: null, layout_h: null }], connections: [] };
    const doc = buildExport(withScreens);
    expect(doc.screens[0]?.purpose).toBe("Search by subject");
    expect(exportMarkdown(doc)).toContain("Search by subject");
  });
});