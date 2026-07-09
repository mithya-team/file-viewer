import { useCallback, useEffect, useRef, useState } from "react";
import {
  GlobalWorkerOptions,
  getDocument,
  TextLayer,
  type PageViewport,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import { ViewerStatus } from "../primitives/ViewerStatus";
import {
  FILE_VIEWER_SEARCH_DEBOUNCE_MS,
  OBSERVER_MARGIN,
  PAGE_GAP,
} from "./pdf/constants";
import {
  applyHighlightsForPage,
  charRangeToStringIndices,
  clearHitStyles,
  textLayerStringRuns,
} from "./pdf/pdfSearchHighlights";
import { PDF_SEARCH_HIT_CLASS } from "./pdf/searchHighlightColors";
import { scanPdfMatches } from "./pdf/pdfSearchScan";
import type { PdfSearchMatch, PdfSearchState } from "./pdf/pdfSearchTypes";
import { PDF_WORD_SEG_CLASS, wrapPdfTextLayerRunsWithWordSpans } from "./pdf/pdfTextLayerWordSpans";
import { getPageScrollTopFromSizes } from "./pageScrollTop";
import { RENDERER_VIEWPORT_CENTERED_CLASS } from "./rendererViewport";
import {
  PDF_CANVAS_CLASS,
  PDF_PAGE_COLUMN_CLASS,
  PDF_PAGE_SLOT_CLASS,
  PDF_SCROLL_ROOT_CLASS,
  TEXT_LAYER_CONTAINER_CLASS,
} from "./pdf/textLayerTailwind";
import { usePaginatedScrollStack } from "./usePaginatedScrollStack";

export interface PdfRendererProps {
  blob: Blob;
  page: number;
  pageCount: number;
  zoom: number;
  onError: (error: Error) => void;
  onPageCountChange: (pageCount: number) => void;
  onVisiblePageChange?: (page: number) => void;
  onProgrammaticPageNavigateSettled?: (page: number) => void;
  searchQuery?: string;
  activeMatchIndex?: number;
  onSearchStateChange?: (state: PdfSearchState) => void;
  onRequestPageForSearch?: (page: number) => void;
}

/** Below this size, persisted/base64 payloads are almost certainly truncated. */
const MIN_PDF_BYTES = 128;

if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerPort = new PdfWorker();
}

function normalizeRenderError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("Failed to render PDF.");
}

async function loadPdfDocument(blob: Blob): Promise<PDFDocumentProxy> {
  if (blob.size < MIN_PDF_BYTES) {
    throw new Error("PDF data is too small or incomplete.");
  }

  const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  if (
    header[0] !== 0x25
    || header[1] !== 0x50
    || header[2] !== 0x44
    || header[3] !== 0x46
  ) {
    throw new Error("Invalid PDF data.");
  }

  const data = await blob.arrayBuffer();
  const loadingTask = getDocument({ data });
  return loadingTask.promise;
}

export function PdfRenderer({
  blob,
  page,
  zoom,
  onError,
  onPageCountChange,
  onVisiblePageChange,
  onProgrammaticPageNavigateSettled,
  searchQuery = "",
  activeMatchIndex = 0,
  onSearchStateChange,
  onRequestPageForSearch,
}: PdfRendererProps) {
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const textLayerByPageRef = useRef<Map<number, TextLayer>>(new Map());
  const searchMatchesRef = useRef<PdfSearchMatch[]>([]);
  const activeMatchIdxRef = useRef(0);
  const pageStringsRef = useRef<Map<number, string[]>>(new Map());
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderingRef = useRef<Set<number>>(new Set());
  const renderedScaleRef = useRef<Map<number, number>>(new Map());

  const onErrorRef = useRef(onError);
  const onPageCountChangeRef = useRef(onPageCountChange);
  const onSearchStateChangeRef = useRef(onSearchStateChange);
  const onRequestPageForSearchRef = useRef(onRequestPageForSearch);

  onErrorRef.current = onError;
  onPageCountChangeRef.current = onPageCountChange;
  onSearchStateChangeRef.current = onSearchStateChange;
  onRequestPageForSearchRef.current = onRequestPageForSearch;

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageSizes, setPageSizes] = useState<Map<number, { w: number; h: number }>>(
    () => new Map(),
  );
  const [searchMatches, setSearchMatches] = useState<PdfSearchMatch[]>([]);
  const renderPageRef = useRef<((pageNum: number) => void) | null>(null);

  searchMatchesRef.current = searchMatches;
  activeMatchIdxRef.current = activeMatchIndex;

  const isDocumentLoading = pdfDocument == null;
  const searchActive = searchQuery.trim().length > 0;

  const getEffectiveScale = useCallback(() => zoom / 100, [zoom]);

  const getPageScrollTop = useCallback(
    (targetPage: number) =>
      getPageScrollTopFromSizes(targetPage, pageSizes, getEffectiveScale(), PAGE_GAP),
    [getEffectiveScale, pageSizes],
  );

  const { scrollRef } = usePaginatedScrollStack({
    numPages,
    isDocumentLoading,
    page,
    layoutKey: zoom,
    onVisiblePageChange,
    onPageNearViewport: (pageNum) => {
      renderPageRef.current?.(pageNum);
    },
    getPageScrollTop,
    onProgrammaticPageNavigateSettled,
  });

  const reapplyAllHighlights = useCallback(() => {
    if (!searchActive) return;
    textLayerByPageRef.current.forEach((layer, pageNum) => {
      const strings = pageStringsRef.current.get(pageNum);
      applyHighlightsForPage(
        pageNum,
        layer,
        strings,
        searchMatchesRef.current,
        activeMatchIdxRef.current,
      );
    });
  }, [searchActive]);

  const renderTextLayerForPage = useCallback(
    async (
      pageNum: number,
      pdfPage: Awaited<ReturnType<PDFDocumentProxy["getPage"]>>,
      viewport: PageViewport,
    ): Promise<boolean> => {
      const container = textLayerContainerRefs.current.get(pageNum);
      if (!container) return false;

      const scale = getEffectiveScale();
      const prev = textLayerByPageRef.current.get(pageNum);
      prev?.cancel();

      container.replaceChildren();
      container.style.setProperty("--scale-factor", String(scale));

      let textContent: Awaited<ReturnType<typeof pdfPage.getTextContent>>;
      try {
        textContent = await pdfPage.getTextContent();
      } catch {
        return false;
      }

      const textLayer = new TextLayer({
        textContentSource: textContent,
        container,
        viewport,
      });
      textLayerByPageRef.current.set(pageNum, textLayer);
      try {
        await textLayer.render();
      } catch {
        return false;
      }

      if (searchActive) {
        wrapPdfTextLayerRunsWithWordSpans(
          textLayer.textDivs as unknown as HTMLElement[],
        );
        const strings = pageStringsRef.current.get(pageNum);
        applyHighlightsForPage(
          pageNum,
          textLayer,
          strings,
          searchMatchesRef.current,
          activeMatchIdxRef.current,
        );
      }
      return true;
    },
    [getEffectiveScale, searchActive],
  );

  const renderPage = useCallback(
    (pageNum: number) => {
      const doc = pdfDocRef.current;
      const canvas = canvasRefs.current.get(pageNum);
      if (!doc || !canvas || renderingRef.current.has(pageNum)) return;

      const scale = getEffectiveScale();
      if (renderedScaleRef.current.get(pageNum) === scale) return;

      renderingRef.current.add(pageNum);

      void doc
        .getPage(pageNum)
        .then((pdfPage) => {
          const viewport = pdfPage.getViewport({ scale });
          const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            renderingRef.current.delete(pageNum);
            return;
          }
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          return pdfPage.render({ canvasContext: ctx, viewport }).promise.then(async () => {
            const textLayerReady = await renderTextLayerForPage(pageNum, pdfPage, viewport);
            if (textLayerReady) {
              renderedScaleRef.current.set(pageNum, scale);
            }
            renderingRef.current.delete(pageNum);
          });
        })
        .catch((error) => {
          renderingRef.current.delete(pageNum);
          onErrorRef.current(normalizeRenderError(error));
        });
    },
    [getEffectiveScale, renderTextLayerForPage],
  );

  renderPageRef.current = renderPage;

  const renderVisiblePages = useCallback(() => {
    const container = scrollRef.current;
    if (!container || isDocumentLoading) return;
    const wrappers = Array.from(
      container.querySelectorAll<HTMLElement>("[data-page-num]"),
    );
    const containerRect = container.getBoundingClientRect();
    wrappers.forEach((wrapper) => {
      const pageNum = Number(wrapper.dataset.pageNum);
      if (!pageNum) return;
      const rect = wrapper.getBoundingClientRect();
      const inViewport =
        rect.bottom >= containerRect.top - OBSERVER_MARGIN
        && rect.top <= containerRect.bottom + OBSERVER_MARGIN;
      if (inViewport) renderPage(pageNum);
    });
  }, [isDocumentLoading, renderPage]);

  useEffect(() => {
    let active = true;
    let loadedDocument: PDFDocumentProxy | null = null;
    setPdfDocument(null);
    setNumPages(0);
    setPageSizes(new Map());
    renderedScaleRef.current.clear();
    renderingRef.current.clear();
    setSearchMatches([]);
    pageStringsRef.current = new Map();
    textLayerByPageRef.current.forEach((layer) => layer.cancel());
    textLayerByPageRef.current.clear();

    void loadPdfDocument(blob)
      .then(async (document) => {
        if (!active) {
          void document.destroy();
          return;
        }
        pdfDocRef.current = document;
        loadedDocument = document;
        setPdfDocument(document);
        setNumPages(document.numPages);
        onPageCountChangeRef.current(document.numPages);

        const sizes = new Map<number, { w: number; h: number }>();
        for (let p = 1; p <= document.numPages; p++) {
          const pg = await document.getPage(p);
          const vp = pg.getViewport({ scale: 1 });
          sizes.set(p, { w: vp.width, h: vp.height });
        }
        if (!active) return;
        setPageSizes(sizes);
      })
      .catch((error) => {
        if (!active) return;
        onErrorRef.current(normalizeRenderError(error));
      });

    return () => {
      active = false;
      setPdfDocument(null);
      pdfDocRef.current = null;
      if (loadedDocument != null) {
        void loadedDocument.destroy();
      }
      textLayerByPageRef.current.forEach((layer) => layer.cancel());
      textLayerByPageRef.current.clear();
    };
  }, [blob]);

  useEffect(() => {
    if (isDocumentLoading) return;
    renderedScaleRef.current.clear();
    renderingRef.current.clear();
    textLayerByPageRef.current.forEach((layer) => layer.cancel());
    textLayerByPageRef.current.clear();
  }, [isDocumentLoading, zoom]);

  useEffect(() => {
    if (isDocumentLoading || numPages === 0) return;
    const id = requestAnimationFrame(() => {
      renderVisiblePages();
    });
    return () => cancelAnimationFrame(id);
  }, [isDocumentLoading, numPages, pageSizes, zoom, renderVisiblePages]);

  useEffect(() => {
    reapplyAllHighlights();
  }, [searchMatches, activeMatchIndex, reapplyAllHighlights]);

  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!doc || isDocumentLoading) return;

    const q = searchQuery.trim();
    if (!q) {
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      pageStringsRef.current = new Map();
      setSearchMatches([]);
      onSearchStateChangeRef.current?.({ totalMatches: 0, isSearching: false });
      textLayerByPageRef.current.forEach((layer) => {
        clearHitStyles(layer);
      });
      renderVisiblePages();
      return;
    }

    onSearchStateChangeRef.current?.({ totalMatches: 0, isSearching: true });

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      searchAbortRef.current?.abort();
      const ac = new AbortController();
      searchAbortRef.current = ac;

      void (async () => {
        try {
          const { matches, pageStrings } = await scanPdfMatches(doc, q, ac.signal);
          if (ac.signal.aborted) return;
          pageStringsRef.current = pageStrings;
          setSearchMatches(matches);
          onSearchStateChangeRef.current?.({
            totalMatches: matches.length,
            isSearching: false,
          });
          renderedScaleRef.current.clear();
          textLayerByPageRef.current.forEach((layer) => layer.cancel());
          textLayerByPageRef.current.clear();
          renderVisiblePages();
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          onSearchStateChangeRef.current?.({ totalMatches: 0, isSearching: false });
        }
      })();
    }, FILE_VIEWER_SEARCH_DEBOUNCE_MS);

    return () => {
      searchAbortRef.current?.abort();
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [searchQuery, blob, isDocumentLoading, renderVisiblePages]);

  useEffect(() => {
    if (!searchMatches.length || activeMatchIndex < 0) return;
    const m = searchMatches[Math.min(activeMatchIndex, searchMatches.length - 1)];
    if (!m) return;
    if (m.pageNum !== page) {
      onRequestPageForSearchRef.current?.(m.pageNum);
    }
    const layer = textLayerByPageRef.current.get(m.pageNum);
    const fallback = pageStringsRef.current.get(m.pageNum);
    const runs = layer ? textLayerStringRuns(layer, fallback) : fallback;
    if (!layer || !runs?.length) return;
    const idxs = charRangeToStringIndices(runs, m.start, m.end);
    const div = layer.textDivs[idxs[0]];
    const innerHit = div?.querySelector<HTMLElement>(
      `.${PDF_WORD_SEG_CLASS}.${PDF_SEARCH_HIT_CLASS}`,
    );
    (innerHit ?? div)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeMatchIndex, page, searchMatches]);

  if (isDocumentLoading) {
    return (
      <div className={RENDERER_VIEWPORT_CENTERED_CLASS}>
        <ViewerStatus>Loading PDF...</ViewerStatus>
      </div>
    );
  }

  const scale = getEffectiveScale();

  return (
    <div ref={scrollRef} className={PDF_SCROLL_ROOT_CLASS}>
      <div
        className={PDF_PAGE_COLUMN_CLASS}
        style={{ gap: `var(--file-viewer-page-gap, ${PAGE_GAP}px)` }}
      >
        {Array.from({ length: numPages }, (_, i) => {
          const pageNum = i + 1;
          const sz = pageSizes.get(pageNum);
          const scaledW = sz ? sz.w * scale : 0;
          const scaledH = sz ? sz.h * scale : 0;
          return (
            <div
              key={pageNum}
              data-page-num={pageNum}
              style={{
                width: scaledW || undefined,
                height: scaledH || undefined,
              }}
              className={PDF_PAGE_SLOT_CLASS}
            >
              <canvas
                className={PDF_CANVAS_CLASS}
                ref={(el) => {
                  if (el) canvasRefs.current.set(pageNum, el);
                  else canvasRefs.current.delete(pageNum);
                }}
              />
              <div
                className={TEXT_LAYER_CONTAINER_CLASS}
                ref={(el) => {
                  if (el) textLayerContainerRefs.current.set(pageNum, el);
                  else textLayerContainerRefs.current.delete(pageNum);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
