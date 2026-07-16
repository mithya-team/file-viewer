/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { HtmlRenderer } from "../src/renderers/HtmlRenderer";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("HtmlRenderer", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:html-preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    if (renderer != null) {
      await act(async () => {
        renderer?.unmount();
      });
    }
    renderer = undefined;
    vi.restoreAllMocks();
  });

  it("renders iframe with allow-scripts and without allow-same-origin", async () => {
    const blob = new Blob(["<!doctype html><p>Hi</p>"], { type: "text/html" });

    await act(async () => {
      renderer = create(
        <HtmlRenderer blob={blob} onError={() => undefined} />,
      );
    });
    await flushEffects();

    const iframe = renderer?.root.findByType("iframe");
    expect(iframe).toBeDefined();
    expect(iframe?.props.src).toBe("blob:html-preview");
    expect(iframe?.props.sandbox).toBe("allow-scripts");
    expect(String(iframe?.props.sandbox)).not.toContain("allow-same-origin");
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("revokes object URL on unmount", async () => {
    const blob = new Blob(["<!doctype html><p>Hi</p>"], { type: "text/html" });

    await act(async () => {
      renderer = create(
        <HtmlRenderer blob={blob} onError={() => undefined} />,
      );
    });
    await flushEffects();

    await act(async () => {
      renderer?.unmount();
    });
    renderer = undefined;

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:html-preview");
  });
});
