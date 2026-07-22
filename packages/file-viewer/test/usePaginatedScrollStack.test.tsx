import { describe, expect, it } from "vitest";
import { shouldReportVisiblePageChange } from "../src/renderers/usePaginatedScrollStack";
import { isScrollOffsetNear } from "../src/renderers/pageScrollTop";

describe("shouldReportVisiblePageChange", () => {
  it("ignores observer callbacks that report the current page", () => {
    expect(shouldReportVisiblePageChange(1, 1, false)).toBe(false);
  });

  it("reports when the visible page differs from the controlled page", () => {
    expect(shouldReportVisiblePageChange(2, 1, false)).toBe(true);
  });

  it("ignores callbacks during programmatic scroll", () => {
    expect(shouldReportVisiblePageChange(2, 1, true)).toBe(false);
  });

  it("ignores callbacks while layout is settling after zoom", () => {
    expect(shouldReportVisiblePageChange(2, 1, false, true)).toBe(false);
  });

  it("ignores callbacks while geometry wait holds the programmatic guard", () => {
    expect(shouldReportVisiblePageChange(1, 10, true)).toBe(false);
  });
});

describe("programmatic scroll echo", () => {
  it("skips re-scroll when already at target offset", () => {
    expect(isScrollOffsetNear(480, 481)).toBe(true);
  });
});
