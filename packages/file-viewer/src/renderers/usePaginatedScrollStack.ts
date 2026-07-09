import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import {
  OBSERVER_MARGIN,
  PROGRAMMATIC_SCROLL_GUARD_MS,
} from "./pdf/constants";
import { isScrollOffsetNear } from "./pageScrollTop";

export type UsePaginatedScrollStackOptions = {
  numPages: number;
  isDocumentLoading: boolean;
  page: number;
  onVisiblePageChange?: (page: number) => void;
  onPageNearViewport: (pageNum: number) => void;
  /** Return target scrollTop for `page`, or null if geometry is not ready yet. */
  getPageScrollTop: (page: number) => number | null;
  onProgrammaticPageNavigateSettled?: (page: number) => void;
  layoutKey?: number | string;
  scrollBehavior?: ScrollBehavior;
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
  getPageScrollTop,
  onProgrammaticPageNavigateSettled,
  layoutKey,
  scrollBehavior = "smooth",
}: UsePaginatedScrollStackOptions): UsePaginatedScrollStackResult {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const suppressVisiblePageRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const layoutSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navGenerationRef = useRef(0);
  const geometryRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSettleOnceRef = useRef(true);
  const lastLayoutKeyRef = useRef<number | string | undefined>(layoutKey);
  const hasBoundObserversRef = useRef(false);

  const onVisiblePageChangeRef = useRef(onVisiblePageChange);
  const onPageNearViewportRef = useRef(onPageNearViewport);
  const getPageScrollTopRef = useRef(getPageScrollTop);
  const onSettledRef = useRef(onProgrammaticPageNavigateSettled);
  const pageRef = useRef(page);
  const scrollBehaviorRef = useRef(scrollBehavior);
  onVisiblePageChangeRef.current = onVisiblePageChange;
  onPageNearViewportRef.current = onPageNearViewport;
  getPageScrollTopRef.current = getPageScrollTop;
  onSettledRef.current = onProgrammaticPageNavigateSettled;
  pageRef.current = page;
  scrollBehaviorRef.current = scrollBehavior;

  const clearProgrammaticGuardTimer = useCallback(() => {
    if (programmaticTimerRef.current != null) {
      clearTimeout(programmaticTimerRef.current);
      programmaticTimerRef.current = null;
    }
  }, []);

  const endProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = false;
    clearProgrammaticGuardTimer();
  }, [clearProgrammaticGuardTimer]);

  const notifyProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = true;
    clearProgrammaticGuardTimer();
    programmaticTimerRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
      programmaticTimerRef.current = null;
    }, PROGRAMMATIC_SCROLL_GUARD_MS);
  }, [clearProgrammaticGuardTimer]);

  const settleNavigation = useCallback((
    generation: number,
    targetPage: number,
    emitSettle: boolean,
  ) => {
    if (generation !== navGenerationRef.current) return;
    endProgrammaticScroll();
    if (emitSettle) onSettledRef.current?.(targetPage);
  }, [endProgrammaticScroll]);

  const runProgrammaticScroll = useCallback((
    targetPage: number,
    generation: number,
    emitSettle: boolean,
  ) => {
    const container = scrollRef.current;
    if (container == null) return;

    const targetTop = getPageScrollTopRef.current(targetPage);
    if (targetTop == null) {
      if (geometryRetryTimerRef.current != null) {
        clearTimeout(geometryRetryTimerRef.current);
      }
      geometryRetryTimerRef.current = setTimeout(() => {
        geometryRetryTimerRef.current = null;
        if (generation !== navGenerationRef.current) return;
        runProgrammaticScroll(targetPage, generation, emitSettle);
      }, 50);
      return;
    }

    if (isScrollOffsetNear(container.scrollTop, targetTop)) {
      settleNavigation(generation, targetPage, emitSettle);
      return;
    }

    notifyProgrammaticScroll();

    const onScrollEnd = () => {
      if (typeof container.removeEventListener === "function") {
        container.removeEventListener("scrollend", onScrollEnd);
      }
      settleNavigation(generation, targetPage, emitSettle);
    };

    if (typeof container.addEventListener === "function") {
      container.addEventListener("scrollend", onScrollEnd);
    }
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: targetTop, behavior: scrollBehaviorRef.current });
    } else {
      container.scrollTop = targetTop;
    }

    clearProgrammaticGuardTimer();
    programmaticTimerRef.current = setTimeout(() => {
      if (typeof container.removeEventListener === "function") {
        container.removeEventListener("scrollend", onScrollEnd);
      }
      settleNavigation(generation, targetPage, emitSettle);
    }, PROGRAMMATIC_SCROLL_GUARD_MS);
  }, [clearProgrammaticGuardTimer, notifyProgrammaticScroll, settleNavigation]);

  useEffect(() => {
    if (isDocumentLoading || numPages === 0) return;

    const container = scrollRef.current;
    if (container == null) return;

    const layoutKeyChanged =
      hasBoundObserversRef.current && lastLayoutKeyRef.current !== layoutKey;
    lastLayoutKeyRef.current = layoutKey;
    hasBoundObserversRef.current = true;

    if (layoutKeyChanged) {
      suppressVisiblePageRef.current = true;
      notifyProgrammaticScroll();

      if (layoutSettleTimerRef.current != null) {
        clearTimeout(layoutSettleTimerRef.current);
      }
      layoutSettleTimerRef.current = setTimeout(() => {
        suppressVisiblePageRef.current = false;
        layoutSettleTimerRef.current = null;
      }, PROGRAMMATIC_SCROLL_GUARD_MS);
    }

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
    if (numPages === 0) {
      skipSettleOnceRef.current = true;
    }
  }, [numPages]);

  useEffect(() => {
    if (isDocumentLoading || numPages === 0) return;
    const clamped = Math.min(Math.max(page, 1), numPages);
    const generation = ++navGenerationRef.current;
    const emitSettle = !skipSettleOnceRef.current;
    skipSettleOnceRef.current = false;
    if (geometryRetryTimerRef.current != null) {
      clearTimeout(geometryRetryTimerRef.current);
      geometryRetryTimerRef.current = null;
    }
    runProgrammaticScroll(clamped, generation, emitSettle);
  }, [isDocumentLoading, numPages, page, runProgrammaticScroll]);

  useEffect(() => {
    if (isDocumentLoading || numPages === 0) return;
    if (layoutKey === undefined) return;
    const container = scrollRef.current;
    if (container == null) return;
    const clamped = Math.min(Math.max(pageRef.current, 1), numPages);
    const targetTop = getPageScrollTopRef.current(clamped);
    if (targetTop == null || isScrollOffsetNear(container.scrollTop, targetTop)) return;
    notifyProgrammaticScroll();
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: targetTop, behavior: "auto" });
    } else {
      container.scrollTop = targetTop;
    }
  }, [isDocumentLoading, layoutKey, notifyProgrammaticScroll, numPages]);

  useEffect(() => {
    return () => {
      if (layoutSettleTimerRef.current != null) {
        clearTimeout(layoutSettleTimerRef.current);
      }
      if (programmaticTimerRef.current != null) {
        clearTimeout(programmaticTimerRef.current);
      }
      if (geometryRetryTimerRef.current != null) {
        clearTimeout(geometryRetryTimerRef.current);
      }
      navGenerationRef.current += 1;
    };
  }, []);

  return { scrollRef, notifyProgrammaticScroll };
}
