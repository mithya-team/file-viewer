import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { renderAsync } from "docx-preview";
import { useTranslation } from "react-i18next";
import { FILE_VIEWER_SEARCH_DEBOUNCE_MS } from "@/components/file-viewer/fileViewerSearchDebounceMs";
import type { FileViewerSearchRendererProps } from "@/components/file-viewer/fileViewerSearchTypes";
import { findTextMatchRanges } from "@/components/file-viewer/textSearchMatches";
import {
  applyDocxSearchMarks,
  buildTextIndex,
  clearDocxSearchMarks,
} from "@/components/file-viewer/docxDomSearch";
import { useInDocumentSearch } from "@/components/file-viewer/useInDocumentSearch";

interface DocxRendererProps extends FileViewerSearchRendererProps {
  blob: Blob;
  page: number;
  zoom: number;
  onPageCountChange?: (count: number) => void;
  onVisiblePageChange?: (page: number) => void;
  onRequestPageForSearch?: (page: number) => void;
  onReady?: () => void;
}

export function DocxRenderer({
  blob,
  page,
  zoom,
  onPageCountChange,
  onVisiblePageChange,
  searchQuery = "",
  activeMatchIndex = 0,
  onSearchStateChange,
  onRequestPageForSearch,
  onReady,
}: DocxRendererProps) {
  const { i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLElement[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageFromScrollRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [rendered, setRendered] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [scanMatchTotal, setScanMatchTotal] = useState(0);

  const countSections = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const sections = Array.from(
      el.querySelectorAll<HTMLElement>("section.docx"),
    );
    sectionsRef.current = sections;
    if (sections.length > 0) {
      onPageCountChange?.(sections.length);
    }
  }, [onPageCountChange]);

  useEffect(() => {
    const t = debounceTimerRef.current;
    if (t !== undefined) clearTimeout(t);
    const q = searchQuery.trim();
    if (!q) {
      setDebouncedQuery("");
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, FILE_VIEWER_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current !== undefined) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const isDebouncing =
    searchQuery.trim().length > 0 && debouncedQuery !== searchQuery;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let active = true;
    el.replaceChildren();
    setRendered(false);

    renderAsync(blob, el, undefined, {
      inWrapper: true,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
    })
      .then(() => {
        if (!active) return;
        countSections();
        setRendered(true);
        onReady?.();
      })
      .catch((err) => {
        if (!active) return;
        console.error("docx-preview render error:", err);
        el.textContent = i18n.t(
          "CONSOLE.DATASOURCES.FILE_VIEWER.ERRORS.DOCX_RENDER_FAILED",
        );
        onReady?.();
      });

    return () => {
      active = false;
    };
  }, [blob, i18n, countSections]);

  useEffect(() => {
    if (!rendered) return;
    const root = contentRef.current;
    if (!root) return;

    if (!debouncedQuery.trim()) {
      clearDocxSearchMarks(root);
      setScanMatchTotal(0);
      return;
    }

    clearDocxSearchMarks(root);
    const { fullText } = buildTextIndex(root);
    const matches = findTextMatchRanges(fullText, debouncedQuery);
    applyDocxSearchMarks(root, matches, activeMatchIndex);
    setScanMatchTotal(matches.length);
  }, [rendered, debouncedQuery, blob, activeMatchIndex]);

  useInDocumentSearch({
    totalMatches: isDebouncing ? 0 : scanMatchTotal,
    isSearching: isDebouncing,
    activeMatchIndex,
    onSearchStateChange,
    scrollRootRef: scrollRef,
    scrollEnabled:
      !isDebouncing &&
      scanMatchTotal > 0 &&
      debouncedQuery.trim().length > 0,
    scrollLayoutKey: zoom,
  });

  useEffect(() => {
    if (scanMatchTotal === 0 || activeMatchIndex < 0) return;
    const root = contentRef.current;
    if (!root) return;
    const safeIdx = Math.min(activeMatchIndex, scanMatchTotal - 1);
    const el = root.querySelector(`[data-match-index="${safeIdx}"]`);
    if (!el) return;
    const section = el.closest("section.docx");
    if (!section) return;
    const sections = Array.from(root.querySelectorAll("section.docx"));
    const idx = sections.indexOf(section as HTMLElement);
    if (idx < 0) return;
    const pageNum = idx + 1;
    if (pageNum !== page) {
      onRequestPageForSearch?.(pageNum);
    }
  }, [
    activeMatchIndex,
    page,
    scanMatchTotal,
    onRequestPageForSearch,
    debouncedQuery,
  ]);

  useEffect(() => {
    const sections = sectionsRef.current;
    const container = scrollRef.current;
    if (sections.length === 0 || !container) return;

    observerRef.current?.disconnect();

    const visibleSections = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = sections.indexOf(entry.target as HTMLElement);
          if (idx === -1) return;
          const pageNum = idx + 1;
          if (entry.isIntersecting) {
            visibleSections.set(pageNum, entry.intersectionRatio);
          } else {
            visibleSections.delete(pageNum);
          }
        });
        if (visibleSections.size > 0) {
          let best = 0;
          let bestRatio = 0;
          visibleSections.forEach((ratio, p) => {
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

    observerRef.current = observer;
    sections.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered, onVisiblePageChange]);

  useEffect(() => {
    if (pageFromScrollRef.current) {
      pageFromScrollRef.current = false;
      return;
    }
    const sections = sectionsRef.current;
    if (sections.length === 0) return;
    const idx = Math.min(Math.max(page, 1), sections.length) - 1;
    const target = sections[idx];
    if (!target) return;

    programmaticScrollRef.current = true;
    if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 800);

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const scale = zoom / 100;

  return (
    <div ref={scrollRef} className="h-full w-full overflow-auto bg-transparent">
      <div
        ref={contentRef}
        style={{ zoom: scale }}
      />
    </div>
  );
}
