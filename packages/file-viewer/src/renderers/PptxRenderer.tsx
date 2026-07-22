import { parse as pagusParse, type Presentation } from "@pagus-kit/core";
import { buildFontSubstitutes, renderSlide } from "@pagus-kit/renderer";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPptxPageScrollTopFromSlideCache } from "../pptx/pptxPageScrollTop";
import { namespaceSvgFragmentIds } from "../pptx/namespaceSvgFragmentIds";
import { ViewerStatus } from "../primitives/ViewerStatus";
import { PAGE_GAP } from "./pdf/constants";
import { PDF_PAGE_COLUMN_CLASS, PDF_PAGE_SLOT_CLASS, PDF_SCROLL_ROOT_CLASS } from "./pdf/textLayerTailwind";
import { PptxSlideSlot } from "./PptxSlideSlot";
import { RENDERER_VIEWPORT_CENTERED_CLASS } from "./rendererViewport";
import { usePaginatedScrollStack } from "./usePaginatedScrollStack";

export interface PptxRendererProps {
  blob: Blob;
  page: number;
  navIntent?: number;
  zoom: number;
  onError: (error: Error) => void;
  onPageCountChange: (pageCount: number) => void;
  onGeometryReadyChange?: (ready: boolean) => void;
  onVisiblePageChange?: (page: number) => void;
  onProgrammaticPageNavigateSettled?: (page: number) => void;
}

type SlideCacheEntry = {
  svg: string;
  width: number;
  height: number;
};

type PageSlotState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; entry: SlideCacheEntry }
  | { status: "error"; message: string };

function normalizeRenderError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("Failed to render PPTX.");
}

export function PptxRenderer({
  blob,
  page,
  navIntent = 0,
  zoom,
  onError,
  onPageCountChange,
  onGeometryReadyChange,
  onVisiblePageChange,
  onProgrammaticPageNavigateSettled,
}: PptxRendererProps) {
  const presentationRef = useRef<Presentation | null>(null);
  const fontSubstitutesRef = useRef<Record<string, string>>({});
  const slideCacheRef = useRef<Map<number, SlideCacheEntry>>(new Map());
  const renderingRef = useRef<Set<number>>(new Set());

  const onErrorRef = useRef(onError);
  const onPageCountChangeRef = useRef(onPageCountChange);
  const onGeometryReadyChangeRef = useRef(onGeometryReadyChange);
  onErrorRef.current = onError;
  onPageCountChangeRef.current = onPageCountChange;
  onGeometryReadyChangeRef.current = onGeometryReadyChange;

  const [numPages, setNumPages] = useState(0);
  const [slotState, setSlotState] = useState<Map<number, PageSlotState>>(new Map());
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);

  const scale = zoom / 100;

  const renderSlideSlot = useCallback((pageNum: number) => {
    const presentation = presentationRef.current;
    if (presentation == null || renderingRef.current.has(pageNum)) return;

    const cached = slideCacheRef.current.get(pageNum);
    if (cached != null) {
      setSlotState((prev) => {
        const existing = prev.get(pageNum);
        if (existing?.status === "ready" && existing.entry === cached) {
          return prev;
        }
        const next = new Map(prev);
        next.set(pageNum, { status: "ready", entry: cached });
        return next;
      });
      return;
    }

    const slide = presentation.slides[pageNum - 1];
    if (slide == null) return;

    renderingRef.current.add(pageNum);
    setSlotState((prev) => {
      const next = new Map(prev);
      next.set(pageNum, { status: "loading" });
      return next;
    });

    try {
      const rendered = renderSlide(slide, presentation.slideSize, {
        fontSubstitutes: fontSubstitutesRef.current,
      });
      const entry: SlideCacheEntry = {
        svg: namespaceSvgFragmentIds(rendered.svg, `pptx-slide-${pageNum}`),
        width: rendered.width,
        height: rendered.height,
      };
      slideCacheRef.current.set(pageNum, entry);
      setSlotState((prev) => {
        const next = new Map(prev);
        next.set(pageNum, { status: "ready", entry });
        return next;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to render slide.";
      setSlotState((prev) => {
        const next = new Map(prev);
        next.set(pageNum, { status: "error", message });
        return next;
      });
    } finally {
      renderingRef.current.delete(pageNum);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setIsDocumentLoading(true);
    setNumPages(0);
    setSlotState(new Map());
    slideCacheRef.current.clear();
    renderingRef.current.clear();
    presentationRef.current = null;
    fontSubstitutesRef.current = {};
    onGeometryReadyChangeRef.current?.(false);

    void blob
      .arrayBuffer()
      .then(async (buffer) => {
        if (!active) return;
        let presentation: Presentation;
        try {
          presentation = await pagusParse(buffer);
        } catch (error) {
          onErrorRef.current(normalizeRenderError(error));
          return;
        }
        if (presentation.slides.length === 0) {
          onErrorRef.current(new Error("Presentation has no slides."));
          return;
        }
        presentationRef.current = presentation;
        fontSubstitutesRef.current = buildFontSubstitutes(presentation.fonts);
        setNumPages(presentation.slides.length);
        onPageCountChangeRef.current(presentation.slides.length);
        setIsDocumentLoading(false);
        // Placeholder heights always yield scroll tops once slide count is known.
        onGeometryReadyChangeRef.current?.(true);
      })
      .catch((error) => {
        if (!active) return;
        onErrorRef.current(normalizeRenderError(error));
      });

    return () => {
      active = false;
      slideCacheRef.current.clear();
      renderingRef.current.clear();
      onGeometryReadyChangeRef.current?.(false);
    };
  }, [blob]);

  const getPageScrollTop = useCallback(
    (targetPage: number) =>
      getPptxPageScrollTopFromSlideCache(
        targetPage,
        slideCacheRef.current,
        new Map(),
        scale,
        PAGE_GAP,
      ),
    [scale],
  );

  const { scrollRef } = usePaginatedScrollStack({
    numPages,
    isDocumentLoading,
    page,
    navIntent,
    layoutKey: zoom,
    onVisiblePageChange,
    onPageNearViewport: renderSlideSlot,
    getPageScrollTop,
    onProgrammaticPageNavigateSettled,
  });

  useEffect(() => {
    if (isDocumentLoading || numPages === 0) return;
    const clampedPage = Math.min(Math.max(page, 1), numPages);
    for (let pageNum = 1; pageNum <= clampedPage; pageNum += 1) {
      renderSlideSlot(pageNum);
    }
  }, [isDocumentLoading, numPages, page, renderSlideSlot]);

  if (isDocumentLoading) {
    return (
      <div className={RENDERER_VIEWPORT_CENTERED_CLASS}>
        <ViewerStatus>Loading presentation...</ViewerStatus>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={PDF_SCROLL_ROOT_CLASS}>
      <div
        className={PDF_PAGE_COLUMN_CLASS}
        style={{ gap: `var(--file-viewer-page-gap, ${PAGE_GAP}px)` }}
      >
        {Array.from({ length: numPages }, (_, index) => {
          const pageNum = index + 1;
          const state = slotState.get(pageNum) ?? { status: "idle" };
          const entry = state.status === "ready" ? state.entry : null;
          const scaledW = entry ? entry.width * scale : undefined;
          const scaledH = entry ? entry.height * scale : undefined;

          return (
            <div
              key={pageNum}
              data-page-num={pageNum}
              className={`${PDF_PAGE_SLOT_CLASS} flex min-h-24 items-center justify-center`}
              style={{
                width: scaledW,
                minHeight: scaledH,
              }}
            >
              {state.status === "loading" && (
                <ViewerStatus>Loading slide {pageNum}...</ViewerStatus>
              )}
              {state.status === "error" && (
                <ViewerStatus tone="error">{state.message}</ViewerStatus>
              )}
              {state.status === "ready" && (
                <PptxSlideSlot
                  svg={state.entry.svg}
                  className="h-full w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:max-w-none"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
