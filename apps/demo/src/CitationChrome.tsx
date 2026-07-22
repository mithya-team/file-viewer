import { useEffect, useRef, useState } from "react";
import type {
  FileViewerChromeApi,
  ImageChromeApi,
  PDFChromeApi,
  PptxChromeApi,
} from "@file-viewer/react";

type PaginatedChrome = {
  page: number;
  pageCount: number;
  geometryReady: boolean;
  canPrev: boolean;
  canNext: boolean;
  prevPage: () => void;
  nextPage: () => void;
  setPage: (page: number) => void;
  subscribePageNavigate: (
    listener: (event: { page: number; reason: "programmatic" }) => void,
  ) => () => void;
};

interface CitationChromeProps {
  api: FileViewerChromeApi;
  citationPage: number;
  onSettled: (page: number) => void;
  onReCite?: () => void;
}

function isPdfChromeApi(api: FileViewerChromeApi): api is PDFChromeApi {
  return api.file.kind === "pdf";
}

function isPptxChromeApi(api: FileViewerChromeApi): api is PptxChromeApi {
  return api.file.kind === "pptx";
}

function isImageChromeApi(api: FileViewerChromeApi): api is ImageChromeApi {
  return api.file.kind === "image";
}

function getPaginatedChrome(api: FileViewerChromeApi): PaginatedChrome | null {
  if (isPdfChromeApi(api)) return api.pdf;
  if (isPptxChromeApi(api)) return api.pptx;
  if (isImageChromeApi(api)) return api.image;
  return null;
}

/**
 * Consumer-like chrome: fires setPage(citationPage) as soon as chrome mounts,
 * without waiting for pageCount / geometryReady.
 */
export function CitationChrome({
  api,
  citationPage,
  onSettled,
  onReCite,
}: CitationChromeProps) {
  const paginated = getPaginatedChrome(api);
  const firedKeyRef = useRef<string | null>(null);
  const [lastSettle, setLastSettle] = useState<number | null>(null);
  const docKey = api.file.downloadUrl ?? api.file.kind;

  if (paginated != null) {
    const fireKey = `${docKey}:${citationPage}`;
    if (firedKeyRef.current !== fireKey) {
      firedKeyRef.current = fireKey;
      const target = citationPage;
      const setPage = paginated.setPage;
      queueMicrotask(() => {
        setPage(target);
      });
    }
  }

  useEffect(() => {
    const chrome = getPaginatedChrome(api);
    if (chrome == null) return;
    return chrome.subscribePageNavigate((event) => {
      setLastSettle(event.page);
      onSettled(event.page);
    });
  }, [api, onSettled]);

  if (paginated == null) {
    return (
      <div className="flex items-center gap-2 rounded-t-lg border-b border-slate-300 bg-slate-900 px-3 py-2 text-xs text-slate-100">
        <span className="font-semibold uppercase">{api.file.kind}</span>
        <span className="text-slate-400">no page chrome</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-t-lg border-b border-slate-300 bg-slate-900 px-3 py-2 text-xs text-slate-100">
      <span className="font-semibold uppercase tracking-wide">{api.file.kind}</span>
      <span className="text-slate-300">
        cite→{citationPage} | page {paginated.page}/{paginated.pageCount} | geometry{" "}
        {paginated.geometryReady ? "ready" : "pending"}
        {lastSettle != null ? ` | settled@${lastSettle}` : ""}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={paginated.prevPage}
          disabled={!paginated.canPrev}
          className="cursor-pointer rounded border border-slate-600 px-2 py-1 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={paginated.nextPage}
          disabled={!paginated.canNext}
          className="cursor-pointer rounded border border-slate-600 px-2 py-1 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => {
            paginated.setPage(citationPage);
            onReCite?.();
          }}
          className="cursor-pointer rounded border border-amber-500/60 bg-amber-500/10 px-2 py-1 text-amber-100 transition hover:border-amber-400"
        >
          Re-cite {citationPage}
        </button>
      </div>
    </div>
  );
}
