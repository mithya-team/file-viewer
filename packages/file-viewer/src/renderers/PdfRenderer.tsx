import { EmbedPDF, type PluginBatchRegistrations, useDocumentState } from "@embedpdf/core/react";
import {
  DocumentManagerPluginPackage,
  useDocumentManagerCapability,
} from "@embedpdf/plugin-document-manager/react";
import { RenderLayer, RenderPluginPackage } from "@embedpdf/plugin-render/react";
import {
  Scroller,
  ScrollPluginPackage,
  useScroll,
  useScrollCapability,
} from "@embedpdf/plugin-scroll/react";
import { SearchLayer, SearchPluginPackage, useSearch } from "@embedpdf/plugin-search/react";
import {
  Viewport,
  ViewportPluginPackage,
  useViewportCapability,
  useViewportScrollActivity,
} from "@embedpdf/plugin-viewport/react";
import { ZoomPluginPackage, useZoom } from "@embedpdf/plugin-zoom/react";
import type { PdfEngine, SearchResult } from "@embedpdf/models";
import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { ViewerStatus } from "../primitives/ViewerStatus";
import type { PdfSearchState } from "./pdf/pdfSearchTypes";
import { PDF_PAGE_SLOT_CLASS, PDF_SCROLL_ROOT_CLASS } from "./pdf/textLayerTailwind";
import { RENDERER_VIEWPORT_CENTERED_CLASS } from "./rendererViewport";
import { loadEmbedPdfEngine } from "./pdf/loadEmbedPdfEngine";

export interface PdfRendererProps {
  blob: Blob;
  page: number;
  pageCount: number;
  navIntent?: number;
  zoom: number;
  onError: (error: Error) => void;
  onPageCountChange: (pageCount: number) => void;
  onGeometryReadyChange?: (ready: boolean) => void;
  onVisiblePageChange?: (page: number) => void;
  onProgrammaticPageNavigateSettled?: (page: number) => void;
  searchQuery?: string;
  activeMatchIndex?: number;
  onSearchStateChange?: (state: PdfSearchState) => void;
  onRequestPageForSearch?: (page: number) => void;
}

const MIN_PDF_BYTES = 128;

// EmbedPDF treats the plugins array as an initialization dependency. Keep it
// stable across FileViewer updates so opening a document cannot destroy its
// registry when page or chrome state changes.
const PDF_PLUGIN_PACKAGES: PluginBatchRegistrations = [
  { package: DocumentManagerPluginPackage },
  { package: ViewportPluginPackage },
  { package: ScrollPluginPackage },
  { package: RenderPluginPackage },
  { package: ZoomPluginPackage, config: { defaultZoomLevel: 1 } },
  { package: SearchPluginPackage },
] as never;

function normalizeRenderError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("Failed to render PDF.");
}

async function assertPdfBlob(blob: Blob) {
  if (blob.size < MIN_PDF_BYTES) {
    throw new Error("PDF data is too small or incomplete.");
  }

  const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  if (header[0] !== 0x25 || header[1] !== 0x50 || header[2] !== 0x44 || header[3] !== 0x46) {
    throw new Error("Invalid PDF data.");
  }
}

type PdfDocumentSurfaceProps = Omit<PdfRendererProps, "blob" | "pageCount"> & {
  blob: Blob;
};

type PdfCallbackRefs = {
  onError: MutableRefObject<(error: Error) => void>;
  onPageCountChange: MutableRefObject<(pageCount: number) => void>;
  onGeometryReadyChange: MutableRefObject<PdfRendererProps["onGeometryReadyChange"]>;
  onVisiblePageChange: MutableRefObject<PdfRendererProps["onVisiblePageChange"]>;
  onProgrammaticPageNavigateSettled: MutableRefObject<
    PdfRendererProps["onProgrammaticPageNavigateSettled"]
  >;
  onSearchStateChange: MutableRefObject<PdfRendererProps["onSearchStateChange"]>;
  onRequestPageForSearch: MutableRefObject<PdfRendererProps["onRequestPageForSearch"]>;
};

type PdfDocumentViewportProps = Omit<PdfDocumentSurfaceProps, "blob" | "onError" | "onPageCountChange" | "onGeometryReadyChange" | "onVisiblePageChange" | "onProgrammaticPageNavigateSettled" | "onSearchStateChange" | "onRequestPageForSearch"> & {
  callbacks: PdfCallbackRefs;
  documentId: string;
  lastIntentRef: MutableRefObject<number>;
};

function PdfDocumentSurface({
  blob,
  page,
  navIntent = 0,
  zoom,
  onError,
  onPageCountChange,
  onGeometryReadyChange,
  onVisiblePageChange,
  onProgrammaticPageNavigateSettled,
  searchQuery = "",
  activeMatchIndex = 0,
  onSearchStateChange,
  onRequestPageForSearch,
}: PdfDocumentSurfaceProps) {
  const { provides: documentManager } = useDocumentManagerCapability();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const lastIntentRef = useRef(0);
  const generationRef = useRef(0);
  const onErrorRef = useRef(onError);
  const onPageCountChangeRef = useRef(onPageCountChange);
  const onGeometryReadyChangeRef = useRef(onGeometryReadyChange);
  const onVisiblePageChangeRef = useRef(onVisiblePageChange);
  const onProgrammaticPageNavigateSettledRef = useRef(onProgrammaticPageNavigateSettled);
  const onSearchStateChangeRef = useRef(onSearchStateChange);
  const onRequestPageForSearchRef = useRef(onRequestPageForSearch);
  const zoomRef = useRef(zoom);
  const callbacksRef = useRef<PdfCallbackRefs>({
    onError: onErrorRef,
    onPageCountChange: onPageCountChangeRef,
    onGeometryReadyChange: onGeometryReadyChangeRef,
    onVisiblePageChange: onVisiblePageChangeRef,
    onProgrammaticPageNavigateSettled: onProgrammaticPageNavigateSettledRef,
    onSearchStateChange: onSearchStateChangeRef,
    onRequestPageForSearch: onRequestPageForSearchRef,
  });

  onErrorRef.current = onError;
  onPageCountChangeRef.current = onPageCountChange;
  onGeometryReadyChangeRef.current = onGeometryReadyChange;
  onVisiblePageChangeRef.current = onVisiblePageChange;
  onProgrammaticPageNavigateSettledRef.current = onProgrammaticPageNavigateSettled;
  onSearchStateChangeRef.current = onSearchStateChange;
  onRequestPageForSearchRef.current = onRequestPageForSearch;
  zoomRef.current = zoom;

  useEffect(() => {
    if (documentManager == null) return;
    let disposed = false;
    let openedDocumentId: string | null = null;
    const nextDocumentId = `file-viewer-pdf-${++generationRef.current}`;

    onGeometryReadyChangeRef.current?.(false);
    setDocumentId(null);
    lastIntentRef.current = navIntent > 0 ? navIntent - 1 : 0;
    void blob
      .arrayBuffer()
      .then((buffer) =>
        documentManager
          .openDocumentBuffer({
            buffer,
            name: "document.pdf",
            documentId: nextDocumentId,
            autoActivate: true,
            scale: zoomRef.current / 100,
          })
          .toPromise(),
      )
      .then((response) => {
        openedDocumentId = response.documentId;
        return response.task.toPromise();
      })
      .then((document) => {
        if (disposed) return;
        if (document.pageCount < 1) throw new Error("PDF has no pages.");
        setDocumentId(openedDocumentId ?? nextDocumentId);
        onPageCountChangeRef.current(document.pageCount);
        // Parsing completion means the renderer can be mounted and displayed.
        // Scroll layout readiness remains a separate gate for page commands.
        onGeometryReadyChangeRef.current?.(true);
      })
      .catch((error) => {
        if (!disposed) onErrorRef.current(normalizeRenderError(error));
      });

    return () => {
      disposed = true;
      onGeometryReadyChangeRef.current?.(false);
      if (openedDocumentId != null) {
        documentManager.closeDocument(openedDocumentId).wait(() => undefined, () => undefined);
      }
    };
  }, [blob, documentManager]);

  if (documentId == null) {
    return <div className={RENDERER_VIEWPORT_CENTERED_CLASS}><ViewerStatus>Loading PDF...</ViewerStatus></div>;
  }

  return (
    <PdfDocumentViewport
      callbacks={callbacksRef.current}
      documentId={documentId}
      lastIntentRef={lastIntentRef}
      page={page}
      navIntent={navIntent}
      zoom={zoom}
      searchQuery={searchQuery}
      activeMatchIndex={activeMatchIndex}
    />
  );
}

function PdfDocumentViewport({
  activeMatchIndex = 0,
  callbacks,
  documentId,
  lastIntentRef,
  navIntent = 0,
  page,
  searchQuery = "",
  zoom,
}: PdfDocumentViewportProps) {
  const documentState = useDocumentState(documentId);
  const scroll = useScroll(documentId);
  const { provides: scrollCapability } = useScrollCapability();
  const { provides: viewportCapability } = useViewportCapability();
  const zoomControl = useZoom(documentId);
  const search = useSearch(documentId);
  const scrollActivity = useViewportScrollActivity(documentId);
  const latestNavigationRef = useRef<{ intent: number; page: number } | null>(null);
  const pendingNavigationRef = useRef<{ intent: number; page: number } | null>(null);
  const scrollCapabilityRef = useRef(scrollCapability);
  const scrollProvidesRef = useRef(scroll.provides);
  const scrollActivityRef = useRef(scrollActivity);
  const viewportCapabilityRef = useRef(viewportCapability);
  const zoomProvidesRef = useRef(zoomControl.provides);
  const layoutReadyRef = useRef(false);
  const lastZoomRef = useRef<number | null>(null);
  const flushPendingNavigationRef = useRef(() => {});
  const applyZoomRef = useRef(() => {});

  scrollCapabilityRef.current = scrollCapability;
  scrollProvidesRef.current = scroll.provides;
  scrollActivityRef.current = scrollActivity;
  viewportCapabilityRef.current = viewportCapability;
  zoomProvidesRef.current = zoomControl.provides;

  flushPendingNavigationRef.current = () => {
    if (!layoutReadyRef.current) return;
    const pending = pendingNavigationRef.current;
    const scrollProvides = scrollProvidesRef.current;
    if (pending == null || scrollProvides == null) return;

    pendingNavigationRef.current = null;
    lastIntentRef.current = pending.intent;
    latestNavigationRef.current = pending;
    scrollProvides.scrollToPage({
      pageNumber: pending.page,
      behavior: "smooth",
      alignY: 0,
    });
  };

  applyZoomRef.current = () => {
    // EmbedPDF gates the viewport while a document is loading and releases that
    // gate when the first zoom request is handled. This initial request must
    // therefore happen before layout-ready; waiting for layout-ready would
    // leave the Scroller unmounted and the viewer permanently blank. The
    // document/zoom effect below only calls this for semantic changes, so the
    // request remains stable and does not re-run on every scoped-control update.
    if (lastZoomRef.current === zoom) return;
    // Scaling while a smooth page jump or user scroll is still settling makes
    // EmbedPDF recompute visible pages against an intermediate scroll offset.
    // Hold the requested zoom until the scroll activity is idle so the active
    // page remains anchored throughout the scale transaction.
    if (scrollActivityRef.current.isScrolling || scrollActivityRef.current.isSmoothScrolling) return;
    const viewportScope = viewportCapabilityRef.current?.forDocument(documentId);
    if (viewportScope == null) return;
    const metrics = viewportScope.getMetrics();
    // The first effect can run before ResizeObserver has reported the viewport
    // dimensions. A request made with zero dimensions is ignored by EmbedPDF,
    // so leave it pending for the resize callback below.
    if (metrics.clientWidth === 0 || metrics.clientHeight === 0) return;
    if (zoom === 100) {
      // The document was opened at the default scale already. Releasing the
      // loading gate directly avoids a redundant scale/scroll transaction,
      // which otherwise briefly repaints the first page during initialization.
      viewportScope.releaseGate("zoom");
      lastZoomRef.current = zoom;
      return;
    }
    const zoomProvides = zoomProvidesRef.current;
    if (zoomProvides == null) return;
    lastZoomRef.current = zoom;
    zoomProvides.requestZoom(zoom / 100);
  };

  useEffect(() => {
    if (documentState?.document == null) return;
    callbacks.onPageCountChange.current(documentState.document.pageCount);
  }, [callbacks, documentState?.document]);

  useEffect(() => {
    if (scrollCapability == null) return;
    return scrollCapability.onPageChange((event) => {
      if (event.documentId !== documentId) return;
      const pageChangeState = scrollCapabilityRef.current
        ?.forDocument(documentId)
        .getPageChangeState();
      if (
        pendingNavigationRef.current != null
        || latestNavigationRef.current != null
        || pageChangeState?.isChanging
      ) return;
      callbacks.onVisiblePageChange.current?.(event.pageNumber);
    });
  }, [callbacks, documentId, scrollCapability]);

  useEffect(() => {
    if (scrollCapability == null) return;
    return scrollCapability.onLayoutReady((event) => {
      if (event.documentId !== documentId) return;
      layoutReadyRef.current = true;
      callbacks.onGeometryReadyChange.current?.(true);
      flushPendingNavigationRef.current();
      applyZoomRef.current();
    });
  }, [callbacks, documentId, scrollCapability]);

  useEffect(() => {
    return () => {
      layoutReadyRef.current = false;
      pendingNavigationRef.current = null;
      latestNavigationRef.current = null;
      lastZoomRef.current = null;
      callbacks.onGeometryReadyChange.current?.(false);
    };
  }, [callbacks]);

  useEffect(() => {
    if (navIntent === lastIntentRef.current) return;
    const pageCount = scrollProvidesRef.current?.getTotalPages() ?? scroll.state.totalPages;
    const targetPage = Math.max(1, Math.min(page, pageCount || page));
    pendingNavigationRef.current = { intent: navIntent, page: targetPage };
    flushPendingNavigationRef.current();
  }, [navIntent, page, scroll.state.totalPages]);

  useEffect(() => {
    const pending = latestNavigationRef.current;
    if (pending == null || scrollActivity.isScrolling || scrollActivity.isSmoothScrolling) return;
    if (scroll.state.currentPage !== pending.page) return;
    const frame = requestAnimationFrame(() => {
      const current = latestNavigationRef.current;
      if (current?.intent !== pending.intent || current.page !== pending.page) return;
      latestNavigationRef.current = null;
      callbacks.onProgrammaticPageNavigateSettled.current?.(pending.page);
    });
    return () => cancelAnimationFrame(frame);
  }, [callbacks, scroll.state.currentPage, scrollActivity.isScrolling, scrollActivity.isSmoothScrolling]);

  useEffect(() => {
    applyZoomRef.current();
  }, [documentId, scrollActivity.isScrolling, scrollActivity.isSmoothScrolling, viewportCapability, zoom]);

  useEffect(() => {
    if (viewportCapability == null) return;
    return viewportCapability.onViewportResize((event) => {
      if (event.documentId !== documentId) return;
      applyZoomRef.current();
    });
  }, [documentId, viewportCapability]);

  useEffect(() => {
    if (search.provides == null) return;
    const query = searchQuery.trim();
    if (query.length === 0) {
      search.provides.stopSearch();
      callbacks.onSearchStateChange.current?.({ totalMatches: 0, isSearching: false });
      return;
    }
    search.provides.startSearch();
    search.provides.searchAllPages(query).wait(
      () => undefined,
      (error) => callbacks.onError.current(normalizeRenderError(error)),
    );
  }, [callbacks, search.provides, searchQuery]);

  useEffect(() => {
    callbacks.onSearchStateChange.current?.({
      totalMatches: search.state.total,
      isSearching: search.state.loading,
    });
  }, [callbacks, search.state.loading, search.state.total]);

  useEffect(() => {
    if (search.provides == null || search.state.total < 1) return;
    const matchIndex = Math.max(0, Math.min(activeMatchIndex, search.state.total - 1));
    search.provides.goToResult(matchIndex);
    const result = search.state.results[matchIndex] as SearchResult | undefined;
    if (result != null) callbacks.onRequestPageForSearch.current?.(result.pageIndex + 1);
  }, [activeMatchIndex, callbacks, search.provides, search.state.results, search.state.total]);

  return (
    <Viewport documentId={documentId} className={PDF_SCROLL_ROOT_CLASS}>
      <Scroller
        documentId={documentId}
        renderPage={({ pageIndex }) => (
          <div className={PDF_PAGE_SLOT_CLASS} data-file-viewer-pdf-page={pageIndex + 1}>
            <RenderLayer documentId={documentId} pageIndex={pageIndex} />
            <SearchLayer documentId={documentId} pageIndex={pageIndex} />
          </div>
        )}
      />
    </Viewport>
  );
}

/** Internal EmbedPDF adapter; FileViewer remains the sole chrome surface. */
export function PdfRenderer(props: PdfRendererProps) {
  const [engine, setEngine] = useState<PdfEngine<Blob> | null>(null);
  const [isValid, setIsValid] = useState(false);
  const onErrorRef = useRef(props.onError);
  onErrorRef.current = props.onError;

  useEffect(() => {
    let disposed = false;
    setEngine(null);
    setIsValid(false);
    void assertPdfBlob(props.blob)
      .then(() => loadEmbedPdfEngine())
      .then((nextEngine) => {
        if (!disposed) {
          setIsValid(true);
          setEngine(nextEngine);
        }
      })
      .catch((error) => {
        if (!disposed) onErrorRef.current(normalizeRenderError(error));
      });
    return () => {
      disposed = true;
    };
  }, [props.blob]);

  if (!isValid || engine == null) {
    return <div className={RENDERER_VIEWPORT_CENTERED_CLASS}><ViewerStatus>Loading PDF...</ViewerStatus></div>;
  }

  // EmbedPDF's plugin package generics are invariant in v2.14.4, while its
  // public batch-registration type intentionally accepts heterogeneous plugins.
  return (
    <EmbedPDF
      engine={engine}
      autoMountDomElements={false}
      plugins={PDF_PLUGIN_PACKAGES}
    >
      <PdfDocumentSurface {...props} />
    </EmbedPDF>
  );
}
