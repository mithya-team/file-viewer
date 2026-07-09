import { describe, expect, it } from "vitest";
import {
  getPageScrollTopFromSizes,
  isScrollOffsetNear,
} from "../src/renderers/pageScrollTop";

describe("getPageScrollTopFromSizes", () => {
  it("returns 0 for page 1", () => {
    const sizes = new Map([
      [1, { h: 100 }],
      [2, { h: 200 }],
    ]);
    expect(getPageScrollTopFromSizes(1, sizes, 1, 12)).toBe(0);
  });

  it("sums prior page heights and gaps", () => {
    const sizes = new Map([
      [1, { h: 100 }],
      [2, { h: 200 }],
      [3, { h: 50 }],
    ]);
    expect(getPageScrollTopFromSizes(3, sizes, 1, 12)).toBe(100 + 12 + 200 + 12);
  });

  it("applies scale to heights", () => {
    const sizes = new Map([[1, { h: 100 }]]);
    expect(getPageScrollTopFromSizes(2, sizes, 1.5, 10)).toBe(150 + 10);
  });

  it("returns null when a prior page size is missing", () => {
    const sizes = new Map([[1, { h: 100 }]]);
    expect(getPageScrollTopFromSizes(3, sizes, 1, 12)).toBeNull();
  });

  it("uses placeholder height when provided", () => {
    const sizes = new Map([[1, { h: 100 }]]);
    expect(getPageScrollTopFromSizes(3, sizes, 1, 12, 96)).toBe(100 + 12 + 96 + 12);
  });
});

describe("isScrollOffsetNear", () => {
  it("treats small deltas as near", () => {
    expect(isScrollOffsetNear(100, 101)).toBe(true);
    expect(isScrollOffsetNear(100, 110)).toBe(false);
  });
});
