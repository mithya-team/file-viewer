/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

const { embedPdfState } = vi.hoisted(() => ({
  embedPdfState: {
    plugins: [] as unknown[],
    pageChangeListeners: new Set<(event: { documentId: string; pageNumber: number }) => void>(),
    layoutReadyListeners: new Set<(event: { documentId: string }) => void>(),
    viewportResizeListeners: new Set<(event: { documentId: string }) => void>(),
    pageChangeState: { isChanging: false },
    releaseGate: vi.fn(),
    requestZoom: vi.fn(),
    scrollToPage: vi.fn(),
    scrollActivity: { isScrolling: false, isSmoothScrolling: false },
    documentManager: {
      closeDocument: () => ({ wait: () => undefined }),
      openDocumentBuffer: () => ({
        toPromise: () => Promise.resolve({
          documentId: "pdf-document",
          task: { toPromise: () => Promise.resolve({ pageCount: 1 }) },
        }),
      }),
    },
    useZoom: vi.fn(),
  },
}));

vi.mock("@embedpdf/core/react", () => ({
  EmbedPDF: ({ children, plugins }: { children: unknown; plugins: unknown }) => {
    embedPdfState.plugins.push(plugins);
    return children;
  },
  useDocumentState: () => ({ document: { pageCount: 1 } }),
}));

vi.mock("@embedpdf/plugin-document-manager/react", () => ({
  DocumentManagerPluginPackage: {},
  useDocumentManagerCapability: () => ({
    provides: embedPdfState.documentManager,
  }),
}));

vi.mock("@embedpdf/plugin-render/react", () => ({
  RenderLayer: () => null,
  RenderPluginPackage: {},
}));

vi.mock("@embedpdf/plugin-scroll/react", () => ({
  Scroller: () => null,
  ScrollPluginPackage: {},
  useScroll: () => ({
    provides: {
      getTotalPages: () => 3,
      scrollToPage: embedPdfState.scrollToPage,
    },
    state: { currentPage: 1, totalPages: 3 },
  }),
  useScrollCapability: () => ({
    provides: {
      forDocument: () => ({
        getPageChangeState: () => embedPdfState.pageChangeState,
      }),
      onLayoutReady: (listener: (event: { documentId: string }) => void) => {
        embedPdfState.layoutReadyListeners.add(listener);
        return () => embedPdfState.layoutReadyListeners.delete(listener);
      },
      onPageChange: (listener: (event: { documentId: string; pageNumber: number }) => void) => {
        embedPdfState.pageChangeListeners.add(listener);
        return () => embedPdfState.pageChangeListeners.delete(listener);
      },
    },
  }),
}));

vi.mock("@embedpdf/plugin-search/react", () => ({
  SearchLayer: () => null,
  SearchPluginPackage: {},
  useSearch: () => ({
    provides: {
      goToResult: () => undefined,
      searchAllPages: () => ({ wait: () => undefined }),
      startSearch: () => undefined,
      stopSearch: () => undefined,
    },
    state: { loading: false, results: [], total: 0 },
  }),
}));

vi.mock("@embedpdf/plugin-viewport/react", () => ({
  Viewport: ({ children }: { children: unknown }) => children,
  ViewportPluginPackage: {},
  useViewportCapability: () => ({
    provides: {
      forDocument: () => ({
        getMetrics: () => ({ clientWidth: 640, clientHeight: 480 }),
        releaseGate: embedPdfState.releaseGate,
      }),
      onViewportResize: (listener: (event: { documentId: string }) => void) => {
        embedPdfState.viewportResizeListeners.add(listener);
        return () => embedPdfState.viewportResizeListeners.delete(listener);
      },
    },
  }),
  useViewportScrollActivity: () => embedPdfState.scrollActivity,
}));

vi.mock("@embedpdf/plugin-zoom/react", () => ({
  ZoomPluginPackage: {},
  useZoom: embedPdfState.useZoom.mockImplementation(() => ({
    provides: { requestZoom: embedPdfState.requestZoom },
  })),
}));

vi.mock("@embedpdf/engines/pdfium-worker-engine", () => ({
  createPdfiumEngine: () => ({ mocked: true }),
}));

vi.mock("../src/renderers/pdf/loadEmbedPdfEngine", () => ({
  loadEmbedPdfEngine: () => Promise.resolve({ mocked: true }),
}));

import { PdfRenderer } from "../src/renderers/PdfRenderer";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

function pdfBlob() {
  const bytes = new Uint8Array(128);
  bytes.set([0x25, 0x50, 0x44, 0x46]);
  return new Blob([bytes], { type: "application/pdf" });
}

function emitLayoutReady() {
  embedPdfState.layoutReadyListeners.forEach((listener) => {
    listener({ documentId: "pdf-document" });
  });
}

function emitPageChange(pageNumber: number) {
  embedPdfState.pageChangeListeners.forEach((listener) => {
    listener({ documentId: "pdf-document", pageNumber });
  });
}

describe("PdfRenderer", () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(async () => {
    if (renderer != null) {
      await act(async () => renderer?.unmount());
    }
    renderer = undefined;
    embedPdfState.useZoom.mockClear();
    embedPdfState.releaseGate.mockClear();
    embedPdfState.requestZoom.mockClear();
    embedPdfState.scrollToPage.mockClear();
    embedPdfState.scrollActivity.isScrolling = false;
    embedPdfState.scrollActivity.isSmoothScrolling = false;
    embedPdfState.pageChangeListeners.clear();
    embedPdfState.layoutReadyListeners.clear();
    embedPdfState.viewportResizeListeners.clear();
    embedPdfState.pageChangeState.isChanging = false;
    embedPdfState.plugins.length = 0;
  });

  it("does not create document-scoped hooks before EmbedPDF opens the document", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      renderer = create(
        <PdfRenderer
          blob={pdfBlob()}
          page={1}
          pageCount={0}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await vi.waitFor(() => {
      expect(embedPdfState.useZoom).toHaveBeenCalledWith("pdf-document");
    });
    expect(embedPdfState.useZoom).not.toHaveBeenCalledWith("");
  });

  it("keeps the EmbedPDF registry configuration stable across parent updates", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const blob = pdfBlob();

    await act(async () => {
      renderer = create(
        <PdfRenderer
          blob={blob}
          page={1}
          pageCount={0}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    const initialPlugins = embedPdfState.plugins.at(-1);

    await act(async () => {
      renderer?.update(
        <PdfRenderer
          blob={blob}
          page={1}
          pageCount={1}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
    });

    expect(embedPdfState.plugins.at(-1)).toBe(initialPlugins);
  });

  it("queues the latest page command until the EmbedPDF layout is ready", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const blob = pdfBlob();

    await act(async () => {
      renderer = create(
        <PdfRenderer
          blob={blob}
          page={2}
          pageCount={3}
          navIntent={1}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      renderer?.update(
        <PdfRenderer
          blob={blob}
          page={3}
          pageCount={3}
          navIntent={2}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
    });

    expect(embedPdfState.scrollToPage).not.toHaveBeenCalled();

    await act(async () => {
      emitLayoutReady();
    });

    expect(embedPdfState.scrollToPage).toHaveBeenCalledTimes(1);
    expect(embedPdfState.scrollToPage).toHaveBeenCalledWith({
      pageNumber: 3,
      behavior: "smooth",
      alignY: 0,
    });
  });

  it("keeps programmatic page events internal and forwards user scrolling", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const onVisiblePageChange = vi.fn();

    await act(async () => {
      renderer = create(
        <PdfRenderer
          blob={pdfBlob()}
          page={2}
          pageCount={3}
          navIntent={1}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
          onVisiblePageChange={onVisiblePageChange}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await vi.waitFor(() => {
      expect(embedPdfState.useZoom).toHaveBeenCalledWith("pdf-document");
    });
    await act(async () => {
      emitLayoutReady();
      embedPdfState.pageChangeState.isChanging = true;
      emitPageChange(2);
    });

    expect(onVisiblePageChange).not.toHaveBeenCalled();

    await act(async () => {
      renderer?.unmount();
      renderer = create(
        <PdfRenderer
          blob={pdfBlob()}
          page={1}
          pageCount={3}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
          onVisiblePageChange={onVisiblePageChange}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await vi.waitFor(() => {
      expect(embedPdfState.pageChangeListeners.size).toBe(1);
    });
    await act(async () => {
      embedPdfState.pageChangeState.isChanging = false;
      emitPageChange(3);
    });

    expect(onVisiblePageChange).toHaveBeenCalledWith(3);
  });

  it("releases the viewport gate without a redundant initial zoom and applies later zoom changes once", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const blob = pdfBlob();

    await act(async () => {
      renderer = create(
        <PdfRenderer
          blob={blob}
          page={1}
          pageCount={3}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await vi.waitFor(() => {
      expect(embedPdfState.useZoom).toHaveBeenCalledWith("pdf-document");
    });

    // The document was opened at 100%, so opening the gate directly avoids a
    // redundant scale/scroll transaction that can repaint the first page.
    expect(embedPdfState.releaseGate).toHaveBeenCalledTimes(1);
    expect(embedPdfState.releaseGate).toHaveBeenLastCalledWith("zoom");
    expect(embedPdfState.requestZoom).not.toHaveBeenCalled();

    await act(async () => {
      emitLayoutReady();
    });

    expect(embedPdfState.releaseGate).toHaveBeenCalledTimes(1);
    expect(embedPdfState.requestZoom).not.toHaveBeenCalled();

    await act(async () => {
      renderer?.update(
        <PdfRenderer
          blob={blob}
          page={2}
          pageCount={3}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
    });

    expect(embedPdfState.releaseGate).toHaveBeenCalledTimes(1);
    expect(embedPdfState.requestZoom).not.toHaveBeenCalled();

    await act(async () => {
      renderer?.update(
        <PdfRenderer
          blob={blob}
          page={2}
          pageCount={3}
          zoom={150}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
    });

    expect(embedPdfState.requestZoom).toHaveBeenCalledTimes(1);
    expect(embedPdfState.requestZoom).toHaveBeenLastCalledWith(1.5);
  });

  it("waits to apply a zoom change until scroll activity is idle", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const blob = pdfBlob();

    await act(async () => {
      renderer = create(
        <PdfRenderer
          blob={blob}
          page={1}
          pageCount={3}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    embedPdfState.scrollActivity.isSmoothScrolling = true;
    await act(async () => {
      renderer?.update(
        <PdfRenderer
          blob={blob}
          page={1}
          pageCount={3}
          zoom={150}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
    });
    expect(embedPdfState.requestZoom).not.toHaveBeenCalled();

    embedPdfState.scrollActivity.isSmoothScrolling = false;
    await act(async () => {
      renderer?.update(
        <PdfRenderer
          blob={blob}
          page={1}
          pageCount={3}
          zoom={150}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
    });
    expect(embedPdfState.requestZoom).toHaveBeenCalledTimes(1);
    expect(embedPdfState.requestZoom).toHaveBeenLastCalledWith(1.5);
  });
});
