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
  it("penalises open questions", () => {
    expect(computeReadiness([{ status: "confirmed" }], [{ status: "open" }]).score).toBe(98);
  });
});
