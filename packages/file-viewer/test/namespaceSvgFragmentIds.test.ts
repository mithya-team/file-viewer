import { describe, expect, it } from "vitest";
import { namespaceSvgFragmentIds } from "../src/pptx/namespaceSvgFragmentIds";

describe("namespaceSvgFragmentIds", () => {
  it("prefixes def ids and url references", () => {
    const svg =
      '<svg><defs><clipPath id="pagus_1"><rect/></clipPath></defs><g clip-path="url(#pagus_1)"/></svg>';
    const namespaced = namespaceSvgFragmentIds(svg, "pptx-slide-6");
    expect(namespaced).toContain('id="pptx-slide-6__pagus_1"');
    expect(namespaced).toContain('url(#pptx-slide-6__pagus_1)');
    expect(namespaced).not.toContain('id="pagus_1"');
    expect(namespaced).not.toContain("url(#pagus_1)");
  });

  it("does not partially replace longer ids", () => {
    const svg =
      '<svg><defs><clipPath id="pagus_10"/><clipPath id="pagus_1"/></defs><g clip-path="url(#pagus_10)"/></svg>';
    const namespaced = namespaceSvgFragmentIds(svg, "s");
    expect(namespaced).toContain('url(#s__pagus_10)');
    expect(namespaced).not.toContain("url(#pagus_10)");
    expect(namespaced).toContain('id="s__pagus_1"');
    expect(namespaced).toContain('id="s__pagus_10"');
  });
});
