import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { PDFDocumentProxy } from "pdfjs-dist";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const VIEWPORT_WIDTH = 100;
const VIEWPORT_HEIGHT = 50;
const OBSERVER_MARGIN = 600;

const {
  getDocumentMock,
  TextLayerMock,
  wrapWordSpansMock,
  createFakePdfPage,
  createFakePdfDocument,
  setTransformMock,
  getContextSpy,
  lazyObservers,
  visibleObservers,
} = vi.hoisted(() => {
  const wrapWordSpansMock = vi.fn();
  const setTransformMock = vi.fn();
  const lazyObservers: Array<{
    callback: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
  }> = [];
  const visibleObservers: Array<{
    callback: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
  }> = [];

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

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];

    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      const entry = { callback, options };
      if (options?.rootMargin?.includes(`${OBSERVER_MARGIN}`)) {
        lazyObservers.push(entry);
      } else {
        visibleObservers.push(entry);
      }
    }

    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }

  globalThis.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;

  const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext");

  function createFakePdfPage(pageNum = 1) {
    return {
      getViewport: vi.fn(({ scale }: { scale: number }) => ({
        width: VIEWPORT_WIDTH * scale,
        height: VIEWPORT_HEIGHT * scale,
      })),
      render: vi.fn(() => ({ promise: Promise.resolve() })),
      getTextContent: vi.fn(() =>
        Promise.resolve({
          items: [{ str: `page${pageNum} word` }],
        }),
      ),
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

  const TextLayerMock = vi.fn(function TextLayer(this: {
    textDivs: Array<{ textContent: string; querySelectorAll: () => [] }>;
    cancel: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
  }) {
    this.textDivs = [];
    this.cancel = vi.fn();
    this.render = vi.fn(async () => {
      this.textDivs = [{ textContent: "run", querySelectorAll: () => [] }];
    });
  });

  return {
    getDocumentMock,
    TextLayerMock,
    wrapWordSpansMock,
    createFakePdfPage,
    createFakePdfDocument,
    setTransformMock,
    getContextSpy,
    lazyObservers,
    visibleObservers,
  };
});

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?worker", () => ({
  default: class MockPdfWorker {},
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerPort: null },
  getDocument: getDocumentMock,
  TextLayer: TextLayerMock,
}));

vi.mock("../src/renderers/pdf/pdfTextLayerWordSpans", () => ({
  PDF_WORD_SEG_CLASS: "pdf-word-seg",
  wrapPdfTextLayerRunsWithWordSpans: wrapWordSpansMock,
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

async function waitFor<T>(read: () => T | null, attempts = 40): Promise<T> {
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

function createIntersectionTarget(pageNum: number) {
  return {
    dataset: { pageNum: String(pageNum) },
    getBoundingClientRect: () => ({
      top: 0,
      bottom: 100,
      left: 0,
      right: 100,
    }),
  };
}

function triggerLazyIntersection(_renderer: ReactTestRenderer, pageNum: number) {
  const lazyObserver = lazyObservers.at(-1);
  lazyObserver?.callback(
    [
      {
        isIntersecting: true,
        target: createIntersectionTarget(pageNum),
        intersectionRatio: 1,
      } as IntersectionObserverEntry,
    ],
    lazyObserver as unknown as IntersectionObserver,
  );
}

function triggerVisiblePage(_renderer: ReactTestRenderer, pageNum: number) {
  const visibleObserver = visibleObservers.at(-1);
  visibleObserver?.callback(
    [
      {
        isIntersecting: true,
        target: createIntersectionTarget(pageNum),
        intersectionRatio: 1,
      } as IntersectionObserverEntry,
    ],
    visibleObserver as unknown as IntersectionObserver,
  );
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
  const pageSlotHosts = new Map<number, { scrollIntoView: ReturnType<typeof vi.fn> }>();
  let originalDevicePixelRatio: number | undefined;
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  async function renderPdfRenderer(
    element: ReactElement,
  ): Promise<ReactTestRenderer> {
    pageSlotHosts.clear();
    await act(async () => {
      renderer = create(element, {
        createNodeMock: (node) => {
          if (node.type === "canvas") {
            return createCanvasNode();
          }
          if (node.type === "div") {
            const pageNum = node.props["data-page-num"];
            if (pageNum != null) {
              const host = {
                style: { setProperty: vi.fn() },
                replaceChildren: vi.fn(),
                scrollIntoView: scrollIntoViewMock,
                dataset: { pageNum: String(pageNum) },
                getBoundingClientRect: () => ({
                  top: 0,
                  bottom: 100,
                  left: 0,
                  right: 100,
                }),
              };
              pageSlotHosts.set(Number(pageNum), host);
              return host;
            }
            const className = node.props.className as string | undefined;
            if (className?.includes("bg-transparent")) {
              const scrollHost = {
                getBoundingClientRect: () => ({
                  top: 0,
                  bottom: 200,
                  left: 0,
                  right: 200,
                }),
                querySelector: (selector: string) => {
                  const match = selector.match(/data-page-num="(\d+)"/);
                  if (match == null) return null;
                  return pageSlotHosts.get(Number(match[1])) ?? null;
                },
                querySelectorAll: () => Array.from(pageSlotHosts.values()),
              };
              const ref = node.props.ref as
                | ((instance: typeof scrollHost | null) => void)
                | { current?: typeof scrollHost | null }
                | null;
              if (typeof ref === "function") {
                ref(scrollHost);
              } else if (ref != null && "current" in ref) {
                ref.current = scrollHost;
              }
              return scrollHost;
            }
            return {
              style: { setProperty: vi.fn() },
              replaceChildren: vi.fn(),
              dataset: {},
              getBoundingClientRect: () => ({
                top: 0,
                bottom: 100,
                left: 0,
                right: 100,
              }),
              querySelectorAll: () => [],
            };
          }
          return null;
        },
      });
    });
    return renderer as ReactTestRenderer;
  }

  function collectPageSlots(root: ReactTestRenderer["root"]) {
    return root.findAll((node) => node.props["data-page-num"] != null);
  }

  beforeEach(() => {
    pageSlotHosts.clear();
    lazyObservers.length = 0;
    visibleObservers.length = 0;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    getDocumentMock.mockReset();
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(createFakePdfDocument()),
    }));
    TextLayerMock.mockClear();
    wrapWordSpansMock.mockReset();
    setTransformMock.mockReset();
    getContextSpy.mockImplementation(() => ({
      setTransform: setTransformMock,
    }) as unknown as CanvasRenderingContext2D);
    originalDevicePixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });
    scrollIntoViewMock = vi.fn();
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

  it("renders a page slot per document page", async () => {
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(createFakePdfDocument(4)),
    }));

    await renderPdfRenderer(<PdfRenderer {...defaultProps()} />);
    await waitFor(() =>
      collectPageSlots(renderer!.root).length === 4 ? true : null,
    );

    expect(collectPageSlots(renderer!.root)).toHaveLength(4);
  });

  it("lazy-renders intersecting pages only", async () => {
    const document = createFakePdfDocument(3);
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(document),
    }));

    await renderPdfRenderer(<PdfRenderer {...defaultProps()} />);
    await waitFor(() =>
      collectPageSlots(renderer!.root).length === 3 ? true : null,
    );

    (document.getPage as ReturnType<typeof vi.fn>).mockClear();

    await act(async () => {
      triggerLazyIntersection(renderer!, 1);
    });
    await flush();

    expect(document.getPage).toHaveBeenCalledWith(1);
    expect(document.getPage).not.toHaveBeenCalledWith(2);
  });

  it("mounts page slots for programmatic page navigation", async () => {
    const blob = createPdfLikeBlob(128);
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(createFakePdfDocument(3)),
    }));

    await renderPdfRenderer(
      <PdfRenderer {...defaultProps({ blob, page: 2 })} />,
    );
    await waitFor(() =>
      collectPageSlots(renderer!.root).length === 3 ? true : null,
    );
    await flush();

    const pageTwoSlot = renderer!.root.find(
      (node) => node.props["data-page-num"] === 2,
    );
    expect(pageTwoSlot).toBeDefined();
  });

  it("reports visible page via onVisiblePageChange", async () => {
    const onVisiblePageChange = vi.fn();
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(createFakePdfDocument(3)),
    }));

    await renderPdfRenderer(
      <PdfRenderer {...defaultProps({ onVisiblePageChange })} />,
    );
    await waitFor(() =>
      collectPageSlots(renderer!.root).length === 3 ? true : null,
    );

    await act(async () => {
      triggerVisiblePage(renderer!, 2);
    });
    await flush();

    expect(onVisiblePageChange).toHaveBeenCalledWith(2);
  });

  it("re-renders on zoom changes without reloading the document", async () => {
    const blob = createPdfLikeBlob(128);
    const document = createFakePdfDocument(3);
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(document),
    }));

    await renderPdfRenderer(<PdfRenderer {...defaultProps({ blob })} />);
    await waitFor(() =>
      collectPageSlots(renderer!.root).length === 3 ? true : null,
    );

    await act(async () => {
      triggerLazyIntersection(renderer!, 1);
    });
    await flush();

    const pdfPage = await (document.getPage as ReturnType<typeof vi.fn>)(1);

    await act(async () => {
      renderer?.update(<PdfRenderer {...defaultProps({ blob, zoom: 150 })} />);
    });
    await flush();

    await act(async () => {
      triggerLazyIntersection(renderer!, 1);
    });
    await waitFor(() =>
      pdfPage.getViewport.mock.calls.some(
        (call) => call[0]?.scale === 1.5,
      )
        ? true
        : null,
    );

    expect(getDocumentMock).toHaveBeenCalledTimes(1);
    expect(pdfPage.getViewport).toHaveBeenCalledWith({ scale: 1.5 });
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

      await renderPdfRenderer(<PdfRenderer {...defaultProps()} />);
      await flush();

      expect(hasText(renderer, "Loading PDF...")).toBe(true);
      expect(collectPageSlots(renderer!.root).length).toBe(0);

      await act(async () => {
        resolveDocument(createFakePdfDocument());
      });
      await flush();

      await waitFor(() =>
        collectPageSlots(renderer!.root).length > 0 ? true : null,
      );

      expect(hasText(renderer, "Loading PDF...")).toBe(false);
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
      await waitFor(() =>
        collectPageSlots(renderer!.root).length > 0 ? true : null,
      );

      await act(async () => {
        renderer?.update(
          <PdfRenderer {...defaultProps({ blob: secondBlob })} />,
        );
      });
      await flush();

      expect(hasText(renderer, "Loading PDF...")).toBe(true);

      await act(async () => {
        resolveSecond(createFakePdfDocument(4));
      });
      await flush();

      await waitFor(() =>
        collectPageSlots(renderer!.root).length === 4 ? true : null,
      );
      expect(hasText(renderer, "Loading PDF...")).toBe(false);
    });
  });

  it("uses transparent scroll root and page sheet classes", async () => {
    await renderPdfRenderer(<PdfRenderer {...defaultProps()} />);
    await waitFor(() =>
      collectPageSlots(renderer!.root).length > 0 ? true : null,
    );

    const scrollRoot = renderer!.root.find(
      (node) =>
        typeof node.props.className === "string"
        && node.props.className.includes("bg-transparent"),
    );
    expect(scrollRoot).toBeDefined();

    const pageSlot = renderer!.root.find(
      (node) => node.props["data-page-num"] === 1,
    );
    expect(pageSlot?.props.className).toContain("bg-(--file-viewer-surface");
  });

  describe("text layer spans", () => {
    it("does not wrap word spans when search is empty", async () => {
      getDocumentMock.mockImplementation(() => ({
        promise: Promise.resolve(createFakePdfDocument(1)),
      }));

      await renderPdfRenderer(<PdfRenderer {...defaultProps()} />);
      await waitFor(() =>
        collectPageSlots(renderer!.root).length === 1 ? true : null,
      );

      await act(async () => {
        triggerLazyIntersection(renderer!, 1);
      });
      await flush();
      await waitFor(() => (TextLayerMock.mock.calls.length > 0 ? true : null));

      expect(wrapWordSpansMock).not.toHaveBeenCalled();
    });

    it("wraps word spans when search query is non-empty", async () => {
      getDocumentMock.mockImplementation(() => ({
        promise: Promise.resolve(createFakePdfDocument(1)),
      }));

      await renderPdfRenderer(
        <PdfRenderer {...defaultProps({ searchQuery: "word" })} />,
      );
      await waitFor(() =>
        collectPageSlots(renderer!.root).length === 1 ? true : null,
      );

      await act(async () => {
        triggerLazyIntersection(renderer!, 1);
      });
      await flush();
      await waitFor(() => (wrapWordSpansMock.mock.calls.length > 0 ? true : null));

      expect(wrapWordSpansMock).toHaveBeenCalled();
    });
  });

  it("applies HiDPI canvas backing store, CSS size, and setTransform", async () => {
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve(createFakePdfDocument(1)),
    }));

    await renderPdfRenderer(<PdfRenderer {...defaultProps()} />);
    await waitFor(() =>
      collectPageSlots(renderer!.root).length === 1 ? true : null,
    );

    await act(async () => {
      triggerLazyIntersection(renderer!, 1);
    });
    await flush();

    await waitFor(() => (setTransformMock.mock.calls.length > 0 ? true : null));

    expect(setTransformMock).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });
});
