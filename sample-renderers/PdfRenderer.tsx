import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "../pdf-text-layer.css";
import { useTranslation } from "react-i18next";
import {
  charRangeToStringIndices,
  scanPdfMatches,
  type PdfSearchMatch,
} from "@/components/file-viewer/pdfSearchScan";
import {
  PDF_WORD_SEG_CLASS,
  wrapPdfTextLayerRunsWithWordSpans,
} from "@/components/file-viewer/pdfTextLayerWordSpans";
import {
  SEARCH_ACTIVE_BG,
  SEARCH_HIT_BG,
} from "@/components/file-viewer/searchHighlightColors";
import type { FileViewerSearchRendererProps } from "@/components/file-viewer/fileViewerSearchTypes";
import { FILE_VIEWER_SEARCH_DEBOUNCE_MS } from "@/components/file-viewer/fileViewerSearchDebounceMs";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const PAGE_GAP = 12;
const OBSERVER_MARGIN = 600;

function clearHitStyles(textLayer: pdfjsLib.TextLayer) {
  for (const div of textLayer.textDivs) {
    div.classList.remove("pdf-search-hit", "pdf-search-active");
    div.style.backgroundColor = "";
    for (const seg of div.querySelectorAll<HTMLElement>(`.${PDF_WORD_SEG_CLASS}`)) {
      seg.classList.remove("pdf-search-hit", "pdf-search-active");
      seg.style.backgroundColor = "";
    }
  }
}

function textLayerStringRuns(
  textLayer: pdfjsLib.TextLayer,
  fallback: string[] | undefined,
): string[] | undefined {
  const runs = (
    textLayer as unknown as { textContentItemsStr?: string[] }
  ).textContentItemsStr;
  if (runs != null && runs.length > 0) return runs;
  return fallback;
}

function applyHighlightsForPage(
  pageNum: number,
  textLayer: pdfjsLib.TextLayer,
  strings: string[] | undefined,
  matches: PdfSearchMatch[],
  activeIdx: number,
) {
  clearHitStyles(textLayer);
  const forRange = textLayerStringRuns(textLayer, strings);
  if (!forRange?.length) return;
  const divs = textLayer.textDivs;
  const runStarts: number[] = new Array(forRange.length);
  let acc = 0;
  for (let r = 0; r < forRange.length; r++) {
    runStarts[r] = acc;
    acc += forRange[r].length;
  }

  for (let mi = 0; mi < matches.length; mi++) {
    const m = matches[mi];
    if (m.pageNum !== pageNum) continue;
    const indices = charRangeToStringIndices(forRange, m.start, m.end);
    const isActive = mi === activeIdx;
    const bg = isActive ? SEARCH_ACTIVE_BG : SEARCH_HIT_BG;
    for (const idx of indices) {
      const div = divs[idx];
      if (!div) continue;
      const runLen = forRange[idx].length;
      const runStart = runStarts[idx];
      const localStart = Math.max(0, m.start - runStart);
      const localEnd = Math.min(runLen, m.end - runStart);
      if (localStart >= localEnd) continue;

      const segs = div.querySelectorAll<HTMLElement>(`.${PDF_WORD_SEG_CLASS}`);
      if (segs.length === 0) {
        div.classList.add("pdf-search-hit");
        div.style.backgroundColor = bg;
        if (isActive) div.classList.add("pdf-search-active");
        continue;
      }

      for (const seg of segs) {
        const segStart = Number(seg.dataset.localStart);
        const segEnd = Number(seg.dataset.localEnd);
        if (
          Number.isFinite(segStart) &&
          Number.isFinite(segEnd) &&
          segEnd > localStart &&
          segStart < localEnd
        ) {
          seg.classList.add("pdf-search-hit");
          seg.style.backgroundColor = bg;
          if (isActive) seg.classList.add("pdf-search-active");
        }
      }
    }
  }
}

interface PdfRendererProps extends FileViewerSearchRendererProps {
  blobUrl: string;
  page: number;
  zoom: number;
  onPageCountChange?: (count: number) => void;
  onVisiblePageChange?: (page: number) => void;
  onRequestPageForSearch?: (page: number) => void;
  onReady?: () => void;
}

export function PdfRenderer({
  blobUrl,
  page,
  zoom,
  onPageCountChange,
  onVisiblePageChange,
  searchQuery = "",
  activeMatchIndex = 0,
  onSearchStateChange,
  onRequestPageForSearch,
  onReady,
}: PdfRendererProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const textLayerByPageRef = useRef<Map<number, pdfjsLib.TextLayer>>(new Map());
  const searchMatchesRef = useRef<PdfSearchMatch[]>([]);
  const activeMatchIdxRef = useRef(0);
  const pageStringsRef = useRef<Map<number, string[]>>(new Map());
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchMatches, setSearchMatches] = useState<PdfSearchMatch[]>([]);
  const renderingRef = useRef<Set<number>>(new Set());
  const renderedScaleRef = useRef<Map<number, number>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleObserverRef = useRef<IntersectionObserver | null>(null);
  const pageFromScrollRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  /** Unscaled size per page (scale 1 viewport); used for wrappers and fit-width. */
  const [pageSizes, setPageSizes] = useState<
    Map<number, { w: number; h: number }>
  >(() => new Map());

  searchMatchesRef.current = searchMatches;
  activeMatchIdxRef.current = activeMatchIndex;

  const getEffectiveScale = useCallback(() => {
    return zoom / 100;
  }, [zoom]);

  const reapplyAllHighlights = useCallback(() => {
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
  }, []);

  const renderTextLayerForPage = useCallback(
    async (
      pageNum: number,
      pdfPage: pdfjsLib.PDFPageProxy,
      viewport: pdfjsLib.PageViewport,
    ) => {
      const container = textLayerContainerRefs.current.get(pageNum);
      if (!container) return;

      const scale = getEffectiveScale();
      const prev = textLayerByPageRef.current.get(pageNum);
      prev?.cancel();

      container.replaceChildren();
      container.style.setProperty("--scale-factor", String(scale));

      let textContent: Awaited<ReturnType<typeof pdfPage.getTextContent>>;
      try {
        textContent = await pdfPage.getTextContent();
      } catch {
        return;
      }

      const textLayer = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container,
        viewport,
      });
      textLayerByPageRef.current.set(pageNum, textLayer);
      try {
        await textLayer.render();
      } catch {
        return;
      }
      wrapPdfTextLayerRunsWithWordSpans(
        textLayer as unknown as { textDivs: HTMLElement[] },
      );
      const strings = pageStringsRef.current.get(pageNum);
      applyHighlightsForPage(
        pageNum,
        textLayer,
        strings,
        searchMatchesRef.current,
        activeMatchIdxRef.current,
      );
    },
    [getEffectiveScale],
  );

  const renderPage = useCallback(
    (pageNum: number) => {
      const doc = pdfDocRef.current;
      const canvas = canvasRefs.current.get(pageNum);
      if (!doc || !canvas || renderingRef.current.has(pageNum)) return;

      const scale = getEffectiveScale();
      if (renderedScaleRef.current.get(pageNum) === scale) return;

      renderingRef.current.add(pageNum);

      doc
        .getPage(pageNum)
        .then((pdfPage) => {
          const viewport = pdfPage.getViewport({ scale });
          const dpr = window.devicePixelRatio || 1;

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

          pdfPage
            .render({ canvasContext: ctx, viewport } as any)
            .promise.then(() => {
              renderedScaleRef.current.set(pageNum, scale);
              renderingRef.current.delete(pageNum);
              void renderTextLayerForPage(pageNum, pdfPage, viewport);
            })
            .catch(() => {
              renderingRef.current.delete(pageNum);
            });
        })
        .catch(() => {
          renderingRef.current.delete(pageNum);
        });
    },
    [getEffectiveScale, renderTextLayerForPage],
  );

  const renderVisiblePages = useCallback(() => {
    const container = scrollRef.current;
    if (!container || loading) return;
    const wrappers = Array.from(
      container.querySelectorAll<HTMLElement>("[data-page-num]"),
    );
    const containerRect = container.getBoundingClientRect();
    wrappers.forEach((wrapper) => {
      const pageNum = Number(wrapper.dataset.pageNum);
      if (!pageNum) return;
      const rect = wrapper.getBoundingClientRect();
      const inViewport =
        rect.bottom >= containerRect.top - OBSERVER_MARGIN &&
        rect.top <= containerRect.bottom + OBSERVER_MARGIN;
      if (inViewport) renderPage(pageNum);
    });
  }, [loading, renderPage]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setNumPages(0);
    setPageSizes(new Map());
    renderedScaleRef.current.clear();
    renderingRef.current.clear();
    setSearchMatches([]);
    pageStringsRef.current = new Map();
    textLayerByPageRef.current.forEach((l) => l.cancel());
    textLayerByPageRef.current.clear();

    const loadingTask = pdfjsLib.getDocument(blobUrl);
    loadingTask.promise
      .then(async (doc) => {
        if (!active) {
          doc.destroy();
          return;
        }
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        onPageCountChange?.(doc.numPages);

        const sizes = new Map<number, { w: number; h: number }>();
        for (let p = 1; p <= doc.numPages; p++) {
          const pg = await doc.getPage(p);
          const vp = pg.getViewport({ scale: 1 });
          sizes.set(p, { w: vp.width, h: vp.height });
        }
        setPageSizes(sizes);
        setLoading(false);
        onReady?.();
      })
      .catch(() => {
        if (!active) return;
        setError(t("CONSOLE.DATASOURCES.FILE_VIEWER.ERRORS.PDF_RENDER_FAILED"));
        setLoading(false);
        onReady?.();
      });

    return () => {
      active = false;
      loadingTask.destroy();
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
      textLayerByPageRef.current.forEach((l) => l.cancel());
      textLayerByPageRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobUrl, t]);

  useEffect(() => {
    if (loading) return;
    renderedScaleRef.current.clear();
    textLayerByPageRef.current.forEach((l) => l.cancel());
    textLayerByPageRef.current.clear();
  }, [loading, zoom]);

  /** Re-rasterize when fit scale / zoom settle — IntersectionObserver may not re-fire for already-visible pages. */
  useEffect(() => {
    if (loading || numPages === 0) return;
    const id = requestAnimationFrame(() => {
      renderVisiblePages();
    });
    return () => cancelAnimationFrame(id);
  }, [loading, numPages, zoom, renderVisiblePages]);

  useEffect(() => {
    if (numPages === 0 || loading) return;

    const container = scrollRef.current;
    if (!container) return;

    observerRef.current?.disconnect();
    visibleObserverRef.current?.disconnect();

    const lazyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = Number(
              (entry.target as HTMLElement).dataset.pageNum,
            );
            if (pageNum) renderPage(pageNum);
          }
        });
      },
      { root: container, rootMargin: `${OBSERVER_MARGIN}px 0px` },
    );

    const visiblePages = new Map<number, number>();
    const visibleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = Number((entry.target as HTMLElement).dataset.pageNum);
          if (!pageNum) return;
          if (entry.isIntersecting) {
            visiblePages.set(pageNum, entry.intersectionRatio);
          } else {
            visiblePages.delete(pageNum);
          }
        });
        if (visiblePages.size > 0) {
          let best = 0;
          let bestRatio = 0;
          visiblePages.forEach((ratio, p) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              best = p;
            }
          });
          if (best > 0 && !programmaticScrollRef.current) {
            pageFromScrollRef.current = true;
            onVisiblePageChange?.(best);
          }
        }
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    observerRef.current = lazyObserver;
    visibleObserverRef.current = visibleObserver;

    const wrappers = container.querySelectorAll<HTMLElement>("[data-page-num]");
    wrappers.forEach((el) => {
      lazyObserver.observe(el);
      visibleObserver.observe(el);
    });

    return () => {
      lazyObserver.disconnect();
      visibleObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, loading, renderPage, zoom]);

  useEffect(() => {
    if (pageFromScrollRef.current) {
      pageFromScrollRef.current = false;
      return;
    }
    if (numPages === 0 || loading) return;
    const container = scrollRef.current;
    if (!container) return;
    const clamped = Math.min(Math.max(page, 1), numPages);
    const target = container.querySelector<HTMLElement>(
      `[data-page-num="${clamped}"]`,
    );
    if (!target) return;

    programmaticScrollRef.current = true;
    if (programmaticTimerRef.current)
      clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 800);

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page, numPages, loading]);

  useEffect(() => {
    reapplyAllHighlights();
  }, [searchMatches, activeMatchIndex, reapplyAllHighlights]);

  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!doc || loading) {
      return;
    }

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
      onSearchStateChange?.({ totalMatches: 0, isSearching: false });
      textLayerByPageRef.current.forEach((layer) => {
        clearHitStyles(layer);
      });
      return;
    }

    onSearchStateChange?.({ totalMatches: 0, isSearching: true });

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      searchAbortRef.current?.abort();
      const ac = new AbortController();
      searchAbortRef.current = ac;

      void (async () => {
        try {
          const { matches, pageStrings } = await scanPdfMatches(
            doc,
            q,
            ac.signal,
          );
          if (ac.signal.aborted) return;
          pageStringsRef.current = pageStrings;
          setSearchMatches(matches);
          onSearchStateChange?.({
            totalMatches: matches.length,
            isSearching: false,
          });
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          onSearchStateChange?.({ totalMatches: 0, isSearching: false });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, blobUrl, loading]);

  useEffect(() => {
    if (!searchMatches.length || activeMatchIndex < 0) return;
    const m = searchMatches[Math.min(activeMatchIndex, searchMatches.length - 1)];
    if (!m) return;
    if (m.pageNum !== page) {
      onRequestPageForSearch?.(m.pageNum);
    }
    const layer = textLayerByPageRef.current.get(m.pageNum);
    const fallback = pageStringsRef.current.get(m.pageNum);
    const runs = layer ? textLayerStringRuns(layer, fallback) : fallback;
    if (!layer || !runs?.length) return;
    const idxs = charRangeToStringIndices(runs, m.start, m.end);
    const div = layer.textDivs[idxs[0]];
    const innerHit = div?.querySelector<HTMLElement>(
      `.${PDF_WORD_SEG_CLASS}.pdf-search-hit`,
    );
    (innerHit ?? div)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeMatchIndex, page, searchMatches, onRequestPageForSearch]);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  const scale = getEffectiveScale();

  return (
    <div
      ref={scrollRef}
      className="h-full min-h-0 min-w-0 flex-1 overflow-auto bg-transparent"
    >
      <div
        className="flex w-full min-w-max flex-col"
        style={{ gap: PAGE_GAP }}
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
              className="pdf-renderer-page relative mx-auto shrink-0 bg-white shadow-md"
            >
              {/* pdf.js: bitmap carries true page colours; TextLayer spans are transparent for selection */}
              <canvas
                className="pointer-events-none absolute inset-0 z-0 block max-h-none max-w-none"
                ref={(el) => {
                  if (el) canvasRefs.current.set(pageNum, el);
                  else canvasRefs.current.delete(pageNum);
                }}
              />
              <div
                className="textLayer pointer-events-auto absolute inset-0 z-10"
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
