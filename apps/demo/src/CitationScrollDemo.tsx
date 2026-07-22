import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileViewer,
  type FileViewerChromeApi,
  type FileViewerSource,
} from "@file-viewer/react";
import { CitationChrome } from "./CitationChrome";
import {
  CITATION_DOC_KINDS,
  readCitationControlsFromLocation,
  replaceCitationControlsInLocation,
  type CitationDemoControls,
  type CitationDocKind,
} from "./citationUrlParams";

const KIND_LABELS: Record<CitationDocKind, string> = {
  pdf: "PDF",
  pptx: "PPTX",
  tiff: "TIFF (multi-page)",
};

const KIND_PATHS: Record<CitationDocKind, string> = {
  pdf: "/sample-files/Sample-Penetration-Test-Report-PurpleSec.pdf",
  pptx: "/sample-files/sample-4.pptx",
  tiff: "/sample-files/Multi_page24bpp.tif",
};

function toAbsoluteFixtureUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

export default function CitationScrollDemo() {
  const [controls, setControls] = useState<CitationDemoControls>(
    readCitationControlsFromLocation,
  );
  const [source, setSource] = useState<FileViewerSource | null>(null);
  const [status, setStatus] = useState("Preparing source...");
  const [error, setError] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<string>("—");
  const [pageDraft, setPageDraft] = useState(String(controls.page));

  const applyControls = useCallback((next: CitationDemoControls) => {
    setControls(next);
    setPageDraft(String(next.page));
    replaceCitationControlsInLocation(next);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const next = readCitationControlsFromLocation();
      setControls(next);
      setPageDraft(String(next.page));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    setStatus("Preparing source...");
    setError(null);
    setEventLog("—");
    const url = toAbsoluteFixtureUrl(KIND_PATHS[controls.kind]);
    void fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Fixture fetch failed (${response.status})`);
        }
        const blob = await response.blob();
        if (!active) return;
        setSource(blob);
        setStatus("Ready");
      })
      .catch((fetchError) => {
        if (!active) return;
        setSource(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to prepare source.",
        );
      });
    return () => {
      active = false;
    };
  }, [controls.kind]);

  const citationChrome = useMemo(
    () =>
      function CitationDemoChrome({ api }: { api: FileViewerChromeApi }) {
        return (
          <CitationChrome
            api={api}
            citationPage={controls.page}
            onSettled={(page) => {
              setEventLog(`settle programmatic @ ${page}`);
            }}
            onReCite={() => {
              setEventLog(`re-cite setPage(${controls.page})`);
            }}
          />
        );
      },
    [controls.page],
  );

  function commitCitationPage() {
    const parsed = Number.parseInt(pageDraft, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setPageDraft(String(controls.page));
      return;
    }
    applyControls({ ...controls, page: parsed });
    setEventLog(`citation target → ${parsed} (early setPage on next chrome mount)`);
  }

  return (
    <div className="flex h-dvh bg-slate-50 text-slate-950">
      <main className="min-h-0 min-w-0 flex-1 p-4">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
            <div className="flex items-center gap-3">
              <strong className="font-semibold text-slate-950">
                Citation scroll demo
              </strong>
              <a
                href="/"
                className="text-slate-600 underline-offset-2 hover:underline"
              >
                ← Main demo
              </a>
            </div>
            <span>
              {KIND_LABELS[controls.kind]} | cite page {controls.page} | {status}
            </span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
            Chrome calls <code className="text-slate-900">setPage(N)</code> on
            mount with no <code className="text-slate-900">pageCount</code> wait
            (consumer citation flow). After land: scroll away — should not snap
            back. Use Re-cite for same-page nav intent.
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {eventLog}
          </div>
          <div className="relative min-h-0 flex-1">
            {error != null ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            ) : source != null ? (
              <FileViewer
                className="absolute inset-0 min-h-0"
                source={source}
                chrome={citationChrome}
              />
            ) : (
              <div className="text-[13px] text-slate-500">Preparing source...</div>
            )}
          </div>
        </div>
      </main>
      <aside className="flex w-[260px] shrink-0 flex-col gap-3.5 border-l border-slate-300 bg-white p-3 shadow-sm">
        <div>
          <div className="mb-2 text-xs font-bold text-slate-700">Document</div>
          <div className="grid gap-1.5">
            {CITATION_DOC_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => applyControls({ ...controls, kind })}
                className={`w-full rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition ${
                  kind === controls.kind
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                {KIND_LABELS[kind]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-bold text-slate-700">
            Citation page
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={pageDraft}
              onChange={(event) => setPageDraft(event.target.value)}
              onBlur={commitCitationPage}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitCitationPage();
                  event.currentTarget.blur();
                }
              }}
              className="w-20 rounded border border-slate-300 px-2 py-1.5 text-xs"
              aria-label="Citation page"
            />
            <button
              type="button"
              onClick={commitCitationPage}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold hover:border-slate-400"
            >
              Apply
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            URL: <code>/citation?kind=pdf&amp;page=3</code>
          </p>
        </div>
      </aside>
    </div>
  );
}
