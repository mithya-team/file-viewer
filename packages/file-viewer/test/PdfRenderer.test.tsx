import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { PDFDocumentProxy } from "pdfjs-dist";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const VIEWPORT_WIDTH = 100;
const VIEWPORT_HEIGHT = 50;

const {
  getDocumentMock,
  createFakePdfPage,
  createFakePdfDocument,
  setTransformMock,
  getContextSpy,
} = vi.hoisted(() => {
  const setTransformMock = vi.fn();

  if (typeof globalThis.window === "undefined") {
    globalThis.window = globalThis as unknown as Window & typeof globalThis;
  }

  if (typeof globalThis.HTMLCanvasElement === "undefined") {
    class MockCanvas {
      width = 0;
      height = 0;
      style = { width: "", height: "" };
      getContext() {
        return { setTransform: setTransformMock };
      }
    }
    globalThis.HTMLCanvasElement =
      MockCanvas as unknown as typeof HTMLCanvasElement;
  }

  const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext");

  function createFakePdfPage() {
    return {
      getViewport: vi.fn(({ scale }: { scale: number }) => ({
        width: VIEWPORT_WIDTH * scale,
        height: VIEWPORT_HEIGHT * scale,
      })),
      render: vi.fn(() => ({ promise: Promise.resolve() })),
    };
  }

  function createFakePdfDocument(numPages = 3): PDFDocumentProxy {
    const page = createFakePdfPage();
    return {
      numPages,
      destroy: vi.fn(),
      getPage: vi.fn(() => Promise.resolve(page)),
    } as unknown as PDFDocumentProxy;
  }

  const getDocumentMock = vi.fn(() => ({
    promise: Promise.resolve(createFakePdfDocument()),
  }));

  return {
    getDocumentMock,
    createFakePdfPage,
    createFakePdfDocument,
    setTransformMock,
    getContextSpy,
  };
});

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?worker", () => ({
  default: class MockPdfWorker {},
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerPort: null },
  getDocument: getDocumentMock,
}));

import { PdfRenderer } from "../src/renderers/PdfRenderer";

function createPdfLikeBlob(size: number, validHeader = true): Blob {
  const bytes = new Uint8Array(size);
  if (validHeader) {
    bytes[0] = 0x25;
    bytes[1] = 0x50;
    bytes[2] = 0x44;
    bytes[3] = 0x46;
  } else {
    bytes.fill(0x41);
  }
  return new Blob([bytes], { type: "application/pdf" });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function waitFor<T>(read: () => T | null, attempts = 30): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = read();
    if (value != null) return value;
    await flush();
  }
  throw new Error("Timed out waiting for value.");
}

function hasText(renderer: ReactTestRenderer | undefined, text: string) {
  if (renderer == null) return false;
  return renderer.root
    .findAll((node) => node.children.join("") === text)
    .length > 0;
}

function defaultProps(overrides: Partial<Parameters<typeof PdfRenderer>[0]> = {}) {
  return {
    blob: createPdfLikeBlob(128),
    page: 1,
    pageCount: 1,
    zoom: 100,
    onError: vi.fn(),
    onPageCountChange: vi.fn(),
    ...overrides,
  };
}

type MockCanvasNode = {
  width: number;
  height: number;
  style: { width: string; height: string };
  getContext: () => { setTransform: typeof setTransformMock };
};

function createCanvasNode(): MockCanvasNode {
  return {
    width: 0,
    height: 0,
    style: { width: "", height: "" },
    getContext: () => ({
      setTransform: setTransformMock,
    }),
  };
}

describe("PdfRenderer", () => {
  let renderer: ReactTestRenderer | undefined;
  let canvasNode: MockCanvasNode | undefined;
  let originalDevicePixelRatio: number | undefined;

  async function renderPdfRenderer(
    element: ReactElement,
  ): Promise<ReactTestRenderer> {
    await act(async () => {
      renderer = create(element, {
        createNodeMock: (node) => {
          if (node.type === "canvas") {
            canvasNode = createCanvasNode();
            return canvasNode;
          }
          return null;
        },
      });
    });
    return renderer as ReactTestRenderer;
  }

  beforeEach(() => {
    canvasNode = undefined;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    getDocumentMock.mockReset();
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(createFakePdfDocument()),
    }));
    setTransformMock.mockReset();
    getContextSpy.mockImplementation(() => ({
      setTransform: setTransformMock,
    }) as unknown as CanvasRenderingContext2D);
    originalDevicePixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });
  });

  afterEach(async () => {
    if (renderer != null) {
      await act(async () => {
        renderer?.unmount();
      });
    }
    renderer = undefined;
    globalThis.IS_REACT_ACT_ENVIRONMENT = undefined;
    if (originalDevicePixelRatio != null) {
      Object.defineProperty(window, "devicePixelRatio", {
        configurable: true,
        value: originalDevicePixelRatio,
      });
    }
    vi.clearAllMocks();
  });

  it("rejects blobs under 128 bytes without calling getDocument", async () => {
    const onError = vi.fn();
    const blob = createPdfLikeBlob(64);

    await renderPdfRenderer(
      <PdfRenderer {...defaultProps({ blob, onError })} />,
    );
    await flush();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "PDF data is too small or incomplete.",
      }),
    );
    expect(getDocumentMock).not.toHaveBeenCalled();
  });

  it("rejects invalid PDF headers without calling getDocument", async () => {
    const onError = vi.fn();
    const blob = createPdfLikeBlob(128, false);

    await renderPdfRenderer(
      <PdfRenderer {...defaultProps({ blob, onError })} />,
    );
    await flush();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid PDF data." }),
    );
    expect(getDocumentMock).not.toHaveBeenCalled();
  });

  it("loads the document once and reports page count", async () => {
    const onPageCountChange = vi.fn();
    const document = createFakePdfDocument(5);
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(document),
    }));

    await renderPdfRenderer(
      <PdfRenderer {...defaultProps({ onPageCountChange })} />,
    );

    await waitFor(() => (getDocumentMock.mock.calls.length > 0 ? true : null));

    expect(getDocumentMock).toHaveBeenCalledTimes(1);
    expect(onPageCountChange).toHaveBeenCalledWith(5);
  });

  it("fetches a new page without reloading the document", async () => {
    const blob = createPdfLikeBlob(128);
    const document = createFakePdfDocument(3);
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(document),
    }));

    await renderPdfRenderer(<PdfRenderer {...defaultProps({ blob })} />);

    await waitFor(() =>
      (document.getPage as ReturnType<typeof vi.fn>).mock.calls.length > 0
        ? true
        : null,
    );
    const initialGetPageCalls = (document.getPage as ReturnType<typeof vi.fn>)
      .mock.calls.length;

    await act(async () => {
      renderer?.update(<PdfRenderer {...defaultProps({ blob, page: 2 })} />);
    });
    await flush();

    expect(getDocumentMock).toHaveBeenCalledTimes(1);
    expect(document.getPage).toHaveBeenCalledTimes(initialGetPageCalls + 1);
    expect(document.getPage).toHaveBeenLastCalledWith(2);
  });

  it("re-renders on zoom changes without reloading the document", async () => {
    const blob = createPdfLikeBlob(128);
    const document = createFakePdfDocument(3);
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(document),
    }));

    await renderPdfRenderer(<PdfRenderer {...defaultProps({ blob })} />);

    await waitFor(() =>
      (document.getPage as ReturnType<typeof vi.fn>).mock.calls.length > 0
        ? true
        : null,
    );
    await act(async () => {
      renderer?.update(<PdfRenderer {...defaultProps({ blob, zoom: 150 })} />);
    });
    await flush();

    const pdfPage = await (document.getPage as ReturnType<typeof vi.fn>).mock
      .results[0]?.value;

    expect(getDocumentMock).toHaveBeenCalledTimes(1);
    expect(pdfPage.getViewport).toHaveBeenCalledWith({ scale: 1 });
    expect(pdfPage.getViewport).toHaveBeenLastCalledWith({ scale: 1.5 });
  });

  it("destroys the prior document and reloads when the blob changes", async () => {
    const firstDocument = createFakePdfDocument(2);
    const secondDocument = createFakePdfDocument(4);
    getDocumentMock
      .mockImplementationOnce(() => ({ promise: Promise.resolve(firstDocument) }))
      .mockImplementationOnce(() => ({ promise: Promise.resolve(secondDocument) }));

    const firstBlob = createPdfLikeBlob(128);
    const secondBlob = createPdfLikeBlob(256);

    await renderPdfRenderer(
      <PdfRenderer {...defaultProps({ blob: firstBlob })} />,
    );

    await waitFor(() => (getDocumentMock.mock.calls.length === 1 ? true : null));

    await act(async () => {
      renderer?.update(
        <PdfRenderer {...defaultProps({ blob: secondBlob })} />,
      );
    });
    await flush();

    expect(getDocumentMock).toHaveBeenCalledTimes(2);
    expect(firstDocument.destroy).toHaveBeenCalled();
  });

  it("forwards getDocument Error messages through onError", async () => {
    const onError = vi.fn();
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.reject(new Error("Corrupt PDF.")),
    }));

    await renderPdfRenderer(
      <PdfRenderer {...defaultProps({ onError })} />,
    );
    await flush();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Corrupt PDF." }),
    );
  });

  it("does not reload when the parent passes new onError references", async () => {
    const blob = createPdfLikeBlob(128);

    await renderPdfRenderer(
      <PdfRenderer {...defaultProps({ blob, onError: vi.fn() })} />,
    );

    await waitFor(() => (getDocumentMock.mock.calls.length > 0 ? true : null));

    await act(async () => {
      renderer?.update(
        <PdfRenderer {...defaultProps({ blob, onError: vi.fn() })} />,
      );
    });
    await act(async () => {
      renderer?.update(
        <PdfRenderer {...defaultProps({ blob, onError: vi.fn() })} />,
      );
    });
    await flush();

    expect(getDocumentMock).toHaveBeenCalledTimes(1);
  });

  describe("loading UI", () => {
    it("shows Loading PDF while getDocument is pending", async () => {
      let resolveDocument: (document: PDFDocumentProxy) => void = () => undefined;
      getDocumentMock.mockImplementation(() => ({
        promise: new Promise<PDFDocumentProxy>((resolve) => {
          resolveDocument = resolve;
        }),
      }));

      await renderPdfRenderer(<PdfRenderer {...defaultProps({ pageCount: 1 })} />);
      await flush();

      expect(hasText(renderer, "Loading PDF...")).toBe(true);
      expect(hasText(renderer, "Page 1 / 1")).toBe(false);

      await act(async () => {
        resolveDocument(createFakePdfDocument());
      });
      await flush();

      await waitFor(() => (hasText(renderer, "Page 1 / 1") ? true : null));

      expect(hasText(renderer, "Loading PDF...")).toBe(false);
    });

    it("hides the page indicator until the document loads", async () => {
      let resolveDocument: (document: PDFDocumentProxy) => void = () => undefined;
      getDocumentMock.mockImplementation(() => ({
        promise: new Promise<PDFDocumentProxy>((resolve) => {
          resolveDocument = resolve;
        }),
      }));

      await renderPdfRenderer(
        <PdfRenderer {...defaultProps({ page: 2, pageCount: 5 })} />,
      );
      await flush();

      expect(hasText(renderer, "Page 2 / 5")).toBe(false);

      await act(async () => {
        resolveDocument(createFakePdfDocument(5));
      });
      await flush();

      await waitFor(() => (hasText(renderer, "Page 2 / 5") ? true : null));
    });

    it("shows loading again when the blob changes before the new document loads", async () => {
      const firstBlob = createPdfLikeBlob(128);
      const secondBlob = createPdfLikeBlob(256);
      let resolveSecond: (document: PDFDocumentProxy) => void = () => undefined;

      getDocumentMock
        .mockImplementationOnce(() => ({
          promise: Promise.resolve(createFakePdfDocument()),
        }))
        .mockImplementationOnce(() => ({
          promise: new Promise<PDFDocumentProxy>((resolve) => {
            resolveSecond = resolve;
          }),
        }));

      await renderPdfRenderer(
        <PdfRenderer {...defaultProps({ blob: firstBlob })} />,
      );
      await waitFor(() => (hasText(renderer, "Page 1 / 1") ? true : null));

      await act(async () => {
        renderer?.update(
          <PdfRenderer {...defaultProps({ blob: secondBlob })} />,
        );
      });
      await flush();

      expect(hasText(renderer, "Loading PDF...")).toBe(true);
      expect(hasText(renderer, "Page 1 / 1")).toBe(false);

      await act(async () => {
        resolveSecond(createFakePdfDocument(4));
      });
      await flush();

      await waitFor(() => (hasText(renderer, "Page 1 / 1") ? true : null));
      expect(hasText(renderer, "Loading PDF...")).toBe(false);
    });
  });

  it("applies HiDPI canvas backing store, CSS size, and setTransform", async () => {
    await renderPdfRenderer(<PdfRenderer {...defaultProps()} />);

    await waitFor(() => (canvasNode != null && canvasNode.width > 0 ? true : null));

    expect(canvasNode?.width).toBe(Math.floor(VIEWPORT_WIDTH * 2));
    expect(canvasNode?.height).toBe(Math.floor(VIEWPORT_HEIGHT * 2));
    expect(canvasNode?.style).toEqual(
      expect.objectContaining({
        width: `${VIEWPORT_WIDTH}px`,
        height: `${VIEWPORT_HEIGHT}px`,
      }),
    );
    expect(setTransformMock).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });
});
