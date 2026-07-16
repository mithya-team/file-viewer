/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { MarkdownRenderer } from "../src/renderers/MarkdownRenderer";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("MarkdownRenderer", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    if (renderer != null) {
      await act(async () => {
        renderer?.unmount();
      });
    }
    renderer = undefined;
  });

  it("renders GFM heading and table", async () => {
    const blob = new Blob(
      ["# Hello\n\n| Col |\n|---|\n| cell |\n"],
      { type: "text/markdown" },
    );

    await act(async () => {
      renderer = create(
        <MarkdownRenderer blob={blob} onError={() => undefined} />,
      );
    });
    await flushEffects();

    const root = renderer?.root;
    expect(root?.findAllByType("h1").some((node) => node.children.includes("Hello"))).toBe(true);
    expect(root?.findAllByType("table").length).toBeGreaterThan(0);
    expect(root?.findAllByType("td").some((node) => node.children.includes("cell"))).toBe(true);
  });

  it("strips script tags from markdown source", async () => {
    const blob = new Blob(
      ['# Safe\n\n<script>window.__md_xss = 1</script>\n\n[bad](javascript:alert(1))\n'],
      { type: "text/markdown" },
    );

    await act(async () => {
      renderer = create(
        <MarkdownRenderer blob={blob} onError={() => undefined} />,
      );
    });
    await flushEffects();

    const root = renderer?.root;
    expect(root?.findAllByType("script")).toHaveLength(0);
    expect((globalThis as { __md_xss?: number }).__md_xss).toBeUndefined();
    const links = root?.findAllByType("a") ?? [];
    for (const link of links) {
      const href = String(link.props.href ?? "");
      expect(href.startsWith("javascript:")).toBe(false);
    }
  });

  it("calls onError when blob text read fails", async () => {
    const onError = vi.fn();
    const blob = {
      text: () => Promise.reject(new Error("read failed")),
    } as Blob;

    await act(async () => {
      renderer = create(
        <MarkdownRenderer blob={blob} onError={onError} />,
      );
    });
    await flushEffects();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });
});
