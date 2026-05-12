import { useEffect, useMemo, useState } from "react";
import { detectFileKind } from "./detect/detectFileKind";
import { ViewerButton } from "./primitives/ViewerButton";
import { ViewerStatus } from "./primitives/ViewerStatus";
import { DocxRenderer } from "./renderers/DocxRenderer";
import { ImageRenderer } from "./renderers/ImageRenderer";
import { PdfRenderer } from "./renderers/PdfRenderer";
import { SpreadsheetRenderer } from "./renderers/SpreadsheetRenderer";
import { TextRenderer } from "./renderers/TextRenderer";
import { loadSourceToBlob } from "./source/loadSourceToBlob";
import type { DetectionResult, FileViewerProps } from "./types";

type ViewerState =
  | { status: "loading" }
  | { status: "ready"; blob: Blob; detection: DetectionResult }
  | { status: "error"; error: Error; reason: "unsupported" | "error" };

type ViewerErrorState = Extract<ViewerState, { status: "error" }>;

function sourceTypeOf(source: FileViewerProps["source"]): "string" | "blob" | "stream" {
  if (typeof source === "string") return "string";
  if (source instanceof Blob) return "blob";
  return "stream";
}

async function resolveViewerState(source: FileViewerProps["source"], signal: AbortSignal) {
  const blob = await loadSourceToBlob(source, signal);
  const detection = await detectFileKind(blob);
  return { blob, detection };
}

export function FileViewer({ source, className, renderFallback, onError }: FileViewerProps) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();
    const sourceType = sourceTypeOf(source);
    setState({ status: "loading" });
    void resolveViewerState(source, abortController.signal)
      .then(({ blob, detection }) => {
        if (abortController.signal.aborted) return;
        if (detection.kind === "unsupported") {
          const error = new Error("Unsupported file type.");
          setState({ status: "error", error, reason: "unsupported" });
          onError?.(error, { stage: "detect", sourceType });
          return;
        }
        setState({ status: "ready", blob, detection });
      })
      .catch((unknownError) => {
        if (abortController.signal.aborted) return;
        const error = unknownError instanceof Error ? unknownError : new Error("Failed to load file source.");
        setState({ status: "error", error, reason: "error" });
        onError?.(error, { stage: "load", sourceType });
      });
    return () => {
      abortController.abort();
    };
  }, [source, onError]);

  useEffect(() => {
    setRenderError(null);
    setPdfPage(1);
    setPdfPageCount(1);
    setPdfZoom(100);
    setSheetNames([]);
    setActiveSheetIndex(0);
  }, [source]);

  useEffect(() => {
    setPdfPage((current) => Math.min(Math.max(current, 1), Math.max(pdfPageCount, 1)));
  }, [pdfPageCount]);

  useEffect(() => {
    setRenderError(null);
  }, [pdfPage, pdfZoom, activeSheetIndex]);

  useEffect(() => {
    if (state.status !== "ready") {
      setObjectUrl((old) => {
        if (old != null) URL.revokeObjectURL(old);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(state.blob);
    setObjectUrl((old) => {
      if (old != null) URL.revokeObjectURL(old);
      return url;
    });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [state]);

  const errorState = useMemo<ViewerErrorState | null>(() => {
    if (state.status === "error") return state;
    if (renderError == null) return null;
    return { status: "error", error: renderError, reason: "error" };
  }, [renderError, state]);

  const fallback = useMemo(() => {
    if (errorState == null) return null;
    if (renderFallback != null) return renderFallback(errorState.reason);
    return (
      <ViewerStatus centered tone={errorState.reason === "error" ? "error" : "default"}>
        {errorState.reason === "unsupported" ? "Unsupported file type." : errorState.error.message}
      </ViewerStatus>
    );
  }, [errorState, renderFallback]);

  function handleRenderError(nextError: Error) {
    setRenderError(nextError);
    onError?.(nextError, { stage: "render", sourceType: sourceTypeOf(source) });
  }

  function handleSheetNamesChange(nextSheetNames: string[]) {
    setSheetNames(nextSheetNames);
    setActiveSheetIndex((current) => {
      if (nextSheetNames.length === 0) return 0;
      return Math.min(current, nextSheetNames.length - 1);
    });
  }

  const toolbarControls = state.status !== "ready" ? null : (
    <>
      {state.detection.kind === "pdf" && (
        <div className="flex items-center gap-2">
          <ViewerButton onClick={() => setPdfPage((current) => Math.max(current - 1, 1))} disabled={pdfPage <= 1}>
            Prev
          </ViewerButton>
          <span className="min-w-20 text-center [color:var(--file-viewer-foreground,_#334155)]">
            Page {pdfPage} / {pdfPageCount}
          </span>
          <ViewerButton
            onClick={() => setPdfPage((current) => Math.min(current + 1, pdfPageCount))}
            disabled={pdfPage >= pdfPageCount}
          >
            Next
          </ViewerButton>
          <ViewerButton onClick={() => setPdfZoom((current) => Math.max(current - 10, 40))}>
            -
          </ViewerButton>
          <span className="[color:var(--file-viewer-foreground,_#334155)]">{pdfZoom}%</span>
          <ViewerButton onClick={() => setPdfZoom((current) => Math.min(current + 10, 300))}>
            +
          </ViewerButton>
        </div>
      )}
      {state.detection.kind === "spreadsheet" && sheetNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sheetNames.map((sheetName, index) => (
            <ViewerButton
              key={sheetName}
              onClick={() => setActiveSheetIndex(index)}
              active={index === activeSheetIndex}
            >
              {sheetName}
            </ViewerButton>
          ))}
        </div>
      )}
      {objectUrl != null && (
        <a
          href={objectUrl}
          download
          className="inline-flex items-center justify-center rounded border px-2 py-1 text-xs [border-color:var(--file-viewer-border,_#cbd5e1)] [background-color:var(--file-viewer-surface,_#ffffff)] [color:var(--file-viewer-foreground,_#334155)]"
        >
          Download
        </a>
      )}
    </>
  );

  const readyContent = state.status !== "ready" || renderError != null ? fallback : (
    <>
      {state.detection.kind === "text" && <TextRenderer blob={state.blob} onError={handleRenderError} />}
      {state.detection.kind === "image" && objectUrl != null && (
        <ImageRenderer objectUrl={objectUrl} onError={handleRenderError} />
      )}
      {state.detection.kind === "spreadsheet" && (
        <SpreadsheetRenderer
          blob={state.blob}
          activeSheetIndex={activeSheetIndex}
          onError={handleRenderError}
          onSheetNamesChange={handleSheetNamesChange}
        />
      )}
      {state.detection.kind === "pdf" && (
        <PdfRenderer
          blob={state.blob}
          page={pdfPage}
          pageCount={pdfPageCount}
          zoom={pdfZoom}
          onError={handleRenderError}
          onPageCountChange={setPdfPageCount}
        />
      )}
      {state.detection.kind === "docx" && <DocxRenderer blob={state.blob} onError={handleRenderError} />}
    </>
  );

  return (
    <div
      className={`flex h-full w-full min-h-0 min-w-0 flex-col rounded border [border-color:var(--file-viewer-border,_#cbd5e1)] [background-color:var(--file-viewer-surface,_#ffffff)] ${className ?? ""}`}
    >
      {state.status === "loading" && (
        <ViewerStatus centered>Loading file...</ViewerStatus>
      )}
      {state.status === "error" && fallback}
      {state.status === "ready" && (
        <>
          <div className="flex flex-wrap items-center gap-3 border-b px-3 py-2 text-xs [border-color:var(--file-viewer-border,_#cbd5e1)] [background-color:var(--file-viewer-surface-muted,_#f8fafc)] [color:var(--file-viewer-muted,_#64748b)]">
            <span>{state.detection.kind.toUpperCase()}</span>
            <span>{state.detection.mimeType || "unknown MIME"}</span>
            <div className="ml-auto flex flex-wrap items-center gap-2">{toolbarControls}</div>
          </div>
          <div className="min-h-0 flex-1">{readyContent}</div>
        </>
      )}
    </div>
  );
}
