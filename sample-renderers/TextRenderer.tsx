import { useEffect, useMemo, useRef, useState } from "react";
import { findTextMatchRanges } from "@/components/file-viewer/textSearchMatches";
import { renderHighlightedTextRanges } from "@/components/file-viewer/highlightTextRanges";
import type { FileViewerSearchRendererProps } from "@/components/file-viewer/fileViewerSearchTypes";
import { useInDocumentSearch } from "@/components/file-viewer/useInDocumentSearch";

interface TextRendererProps extends FileViewerSearchRendererProps {
  blob: Blob;
  fileName?: string;
  mimeType?: string;
  onReady?: () => void;
}

export function TextRenderer({
  blob,
  fileName,
  mimeType,
  searchQuery = "",
  activeMatchIndex = 0,
  onSearchStateChange,
  onReady,
}: TextRendererProps) {
  const [content, setContent] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  const isJson = ext === "json" || mimeType?.includes("json");

  useEffect(() => {
    let active = true;
    blob.text().then((text) => {
      if (!active) return;
      if (isJson) {
        try {
          setContent(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          setContent(text);
        }
      } else {
        setContent(text);
      }
      onReady?.();
    });
    return () => {
      active = false;
    };
  }, [blob, isJson, onReady]);

  const matches = useMemo(
    () =>
      content === null
        ? []
        : findTextMatchRanges(content, searchQuery),
    [content, searchQuery],
  );

  const segments = useMemo(
    () =>
      matches.map((range, i) => ({
        range,
        globalMatchIndex: i,
      })),
    [matches],
  );

  useInDocumentSearch({
    totalMatches: matches.length,
    isSearching: false,
    activeMatchIndex,
    onSearchStateChange,
    scrollRootRef: scrollRef,
    scrollEnabled:
      matches.length > 0 && searchQuery.trim().length > 0,
  });

  if (content === null) return null;

  const body =
    searchQuery.trim().length === 0
      ? content
      : renderHighlightedTextRanges(content, segments, activeMatchIndex);

  return (
    <div
      ref={scrollRef}
      className="h-full w-full overflow-auto pb-4 px-4"
    >
      <pre className="whitespace-pre-wrap wrap-break-word font-mono text-sm text-text-gray-700 leading-relaxed">
        {body}
      </pre>
    </div>
  );
}
