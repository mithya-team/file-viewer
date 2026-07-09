import { describe, expect, it } from "vitest";
import { getPptxPageScrollTop, getPptxPageScrollTopFromSlideCache } from "../src/pptx/pptxPageScrollTop";

describe("getPptxPageScrollTop", () => {
  it("returns 0 for the first page", () => {
    const slots = new Map([
      [1, { status: "ready" as const, height: 400 }],
    ]);
    expect(getPptxPageScrollTop(1, slots, 1, 12)).toBe(0);
  });

  it("sums scaled heights and gaps for preceding slides", () => {
    const slots = new Map([
      [1, { status: "ready" as const, height: 400 }],
      [2, { status: "idle" as const }],
    ]);
    expect(getPptxPageScrollTop(2, slots, 1.5, 12)).toBe(400 * 1.5 + 12);
  });

  it("does not depend on the target slide height", () => {
    const withIdleTarget = new Map([
      [1, { status: "ready" as const, height: 300 }],
      [2, { status: "idle" as const }],
    ]);
    const withReadyTarget = new Map([
      [1, { status: "ready" as const, height: 300 }],
      [2, { status: "ready" as const, height: 900 }],
    ]);
    expect(getPptxPageScrollTop(2, withIdleTarget, 1, 12)).toBe(
      getPptxPageScrollTop(2, withReadyTarget, 1, 12),
    );
  });

  it("prefers synchronously available slide cache heights", () => {
    const cache = new Map([[1, { height: 540 }]]);
    expect(
      getPptxPageScrollTopFromSlideCache(2, cache, new Map(), 1.5, 12),
    ).toBe(540 * 1.5 + 12);
  });
});
