import { describe, expect, it } from "vitest";
import { can, diffBaselines, parseBaseline } from "./baseline";

const req = (id: string, category: string, title: string, description = "") => ({ id, category, title, description });
describe("diffBaselines", () => {
  const v1 = parseBaseline({ requirements: [req("1", "feature", "Search tutors"), req("2", "business_rule", "Refund if cancelled 24h before"), req("3", "feature", "Chat")], screens: [{ key: "search", name: "Search" }] });
  const v2 = parseBaseline({ requirements: [req("1", "feature", "Search tutors by subject"), req("2", "business_rule", "Refund if cancelled 48h before"), req("4", "feature", "Group lessons")], screens: [{ key: "search", name: "Search" }, { key: "group", name: "Groups" }] });
  const d = diffBaselines(v1, v2);
  it("finds added and removed features", () => {
    expect(d.addedFeatures.map((r) => r.title)).toEqual(["Group lessons"]);
    expect(d.removedFeatures.map((r) => r.title)).toEqual(["Chat"]);
  });
  it("separates modified requirements from changed business rules", () => {
    expect(d.modified[0]?.before.title).toBe("Search tutors");
    expect(d.changedRules[0]?.after.title).toBe("Refund if cancelled 48h before");
  });
  it("lists new screens", () => expect(d.addedScreens).toEqual(["Groups"]));
});

describe("role permissions", () => {
  it("only the owner approves baselines", () => {
    expect(can.approve("owner")).toBe(true);
    expect(can.approve("client")).toBe(false);
    expect(can.approve("developer")).toBe(false);
  });
  it("developers cannot confirm requirements but clients can", () => {
    expect(can.confirm("developer")).toBe(false);
    expect(can.confirm("client")).toBe(true);
  });
  it("only developers or owner add estimates", () => {
    expect(can.estimate("developer")).toBe(true);
    expect(can.estimate("client")).toBe(false);
  });
});
