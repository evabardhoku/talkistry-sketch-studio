import { describe, expect, it } from "vitest";
import { computeReadiness } from "./spec";

describe("computeReadiness", () => {
  it("counts only human-confirmed requirements as ready", () => {
    const r = computeReadiness([{ status: "confirmed" }, { status: "proposed" }], []);
    expect(r.confirmed).toBe(1);
    expect(r.score).toBe(50);
  });
  it("ignores deferred and out-of-scope items", () => {
    const r = computeReadiness([{ status: "confirmed" }, { status: "deferred" }, { status: "excluded" }], []);
    expect(r.total).toBe(1);
    expect(r.score).toBe(100);
  });
  it("optional questions never reduce confirmed requirement readiness", () => {
    const r=computeReadiness([{ status: "confirmed" }], [{ status: "open",priority:'secondary' }]);
    expect(r.score).toBe(100); expect(r.decisionBacklog).toBe(0);expect(r.label).toBe('Confirmed');
  });
  it('critical deferred decisions require clarification',()=>{const r=computeReadiness([{status:'confirmed'}],[{status:'deferred',priority:'critical'}]);expect(r.label).toBe('Needs clarification');expect(r.decisionBacklog).toBe(1);});
});
