/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const { createPdfiumEngineMock } = vi.hoisted(() => ({
  createPdfiumEngineMock: vi.fn(
    (_wasmUrl: string, _options: { fontFallback: null }) => ({ mocked: true }),
  ),
}));

vi.mock("@embedpdf/engines/pdfium-worker-engine", () => ({
  createPdfiumEngine: createPdfiumEngineMock,
}));

import { loadEmbedPdfEngine } from "../src/renderers/pdf/loadEmbedPdfEngine";

describe("loadEmbedPdfEngine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses an absolute same-origin PDFium asset and disables remote font fallback", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new ArrayBuffer(0), { status: 200 }),
    );

    await loadEmbedPdfEngine();

    const [wasmUrl, options] = createPdfiumEngineMock.mock.calls[0] ?? [];
    expect(wasmUrl).toEqual(expect.any(String));
    expect(wasmUrl).toMatch(/^https?:\/\//i);
    expect(new URL(wasmUrl).origin).toBe(window.location.origin);
    expect(new URL(wasmUrl).pathname).toContain("pdfium.wasm");
    expect(options).toEqual({ fontFallback: null });
  });

  it("rejects when the PDFium asset cannot be fetched", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 404, statusText: "Not Found" }),
    );

    await expect(loadEmbedPdfEngine()).rejects.toThrow(
      "Failed to load PDFium WASM (404 Not Found).",
    );
    expect(createPdfiumEngineMock).not.toHaveBeenCalled();
  });
});
