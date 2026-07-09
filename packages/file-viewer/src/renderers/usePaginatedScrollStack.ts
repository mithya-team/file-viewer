import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import {
  OBSERVER_MARGIN,
  PROGRAMMATIC_SCROLL_GUARD_MS,
} from "./pdf/constants";

export type UsePaginatedScrollStackOptions = {
  numPages: number;
  isDocumentLoading: boolean;
  page: number;
  onVisiblePageChange?: (page: number) => void;
  onPageNearViewport: (pageNum: number) => void;
  layoutKey?: number | string;
};

export type UsePaginatedScrollStackResult = {
  scrollRef: RefObject<HTMLDivElement | null>;
  notifyProgrammaticScroll: () => void;
};

export function shouldReportVisiblePageChange(
  visiblePage: number,
  currentPage: number,
  programmaticScroll: boolean,
  suppressLayoutSettlement = false,
): boolean {
  return (
    visiblePage > 0 &&
    visiblePage !== currentPage &&
    !programmaticScroll &&
    !suppressLayoutSettlement
  );
}

export function usePaginatedScrollStack({
  numPages,
  isDocumentLoading,
  page,
  onVisiblePageChange,
  onPageNearViewport,
  layoutKey,
}: UsePaginatedScrollStackOptions): UsePaginatedScrollStackResult {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const suppressVisiblePageRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const layoutSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onVisiblePageChangeRef = useRef(onVisiblePageChange);
  const onPageNearViewportRef = useRef(onPageNearViewport);
  const pageRef = useRef(page);
  onVisiblePageChangeRef.current = onVisiblePageChange;
  onPageNearViewportRef.current = onPageNearViewport;
  pageRef.current = page;

  const notifyProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = true;
    if (programmaticTimerRef.current != null) {
      clearTimeout(programmaticTimerRef.current);
    }
    programmaticTimerRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
      programmaticTimerRef.current = null;
    }, PROGRAMMATIC_SCROLL_GUARD_MS);
  }, []);

  useEffect(() => {
    if (isDocumentLoading || numPages === 0) return;

    const container = scrollRef.current;
    if (container == null) return;

    suppressVisiblePageRef.current = true;
    notifyProgrammaticScroll();

    if (layoutSettleTimerRef.current != null) {
      clearTimeout(layoutSettleTimerRef.current);
    }
    layoutSettleTimerRef.current = setTimeout(() => {
      suppressVisiblePageRef.current = false;
      layoutSettleTimerRef.current = null;
    }, PROGRAMMATIC_SCROLL_GUARD_MS);

    const lazyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const pageNum = Number((entry.target as HTMLElement).dataset.pageNum);
          if (pageNum > 0) onPageNearViewportRef.current(pageNum);
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
          visiblePages.forEach((ratio, pageNumber) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              best = pageNumber;
            }
          });
          if (
            shouldReportVisiblePageChange(
              best,
              pageRef.current,
              programmaticScrollRef.current,
              suppressVisiblePageRef.current,
            )
          ) {
            onVisiblePageChangeRef.current?.(best);
          }
        }
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    const wrappers = container.querySelectorAll<HTMLElement>("[data-page-num]");
    wrappers.forEach((element) => {
      lazyObserver.observe(element);
      visibleObserver.observe(element);
    });

    return () => {
      lazyObserver.disconnect();
      visibleObserver.disconnect();
      if (layoutSettleTimerRef.current != null) {
        clearTimeout(layoutSettleTimerRef.current);
      }
      if (programmaticTimerRef.current != null) {
        clearTimeout(programmaticTimerRef.current);
      }
    };
  }, [isDocumentLoading, layoutKey, notifyProgrammaticScroll, numPages]);

  useEffect(() => {
    return () => {
      if (layoutSettleTimerRef.current != null) {
        clearTimeout(layoutSettleTimerRef.current);
      }
      if (programmaticTimerRef.current != null) {
        clearTimeout(programmaticTimerRef.current);
      }
    };
  }, []);

  return { scrollRef, notifyProgrammaticScroll };
}
