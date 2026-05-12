import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { FileViewer } from "../src";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function waitFor<T>(read: () => T | null, attempts = 20): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = read();
    if (value != null) return value;
    await flush();
  }
  throw new Error("Timed out waiting for value.");
}

describe("FileViewer", () => {
  let renderer: ReactTestRenderer;
  let originalCreateObjectURL: typeof URL.createObjectURL | undefined;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    URL.createObjectURL = vi.fn(() => "blob:test-url");
    URL.revokeObjectURL = vi.fn(() => undefined);
    vi.spyOn(console, "warn").mockImplementation((message, ...args) => {
      if (String(message).includes("Please use the `legacy` build in Node.js environments.")) {
        return;
      }
      originalConsoleWarn(message, ...args);
    });
    vi.spyOn(console, "error").mockImplementation((message, ...args) => {
      if (String(message).includes("react-test-renderer is deprecated.")) {
        return;
      }
      originalConsoleError(message, ...args);
    });
  });

  afterEach(async () => {
    if (renderer != null) {
      await act(async () => {
        renderer.unmount();
      });
    }
    globalThis.IS_REACT_ACT_ENVIRONMENT = undefined;
    URL.createObjectURL = originalCreateObjectURL as typeof URL.createObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL as typeof URL.revokeObjectURL;
    vi.restoreAllMocks();
  });

  it("routes renderer failures through renderFallback and onError", async () => {
    const onError = vi.fn();
    const renderFallback = vi.fn((reason: "unsupported" | "error") => <div data-reason={reason}>Fallback: {reason}</div>);
    const source = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });

    await act(async () => {
      renderer = create(<FileViewer source={source} onError={onError} renderFallback={renderFallback} />);
    });

    const image = await waitFor(() => renderer.root.findAllByType("img")[0] ?? null);

    await act(async () => {
      image.props.onError();
    });

    const fallback = await waitFor(() => renderer.root.findAllByProps({ "data-reason": "error" })[0] ?? null);

    expect(fallback.children.join("")).toContain("Fallback: error");
    expect(renderFallback).toHaveBeenCalledWith("error");
    expect(onError).toHaveBeenCalledWith(expect.any(Error), { stage: "render", sourceType: "blob" });
  });
});
