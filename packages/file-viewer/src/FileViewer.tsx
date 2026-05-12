import { useEffect, useMemo, useState } from "react";
import { detectFileKind } from "./detect/detectFileKind";
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

function sourceTypeOf(source: FileViewerProps["source"]): "string" | "blob" | "stream" {
  if (typeof source === "string") return "string";
  if (source instanceof Blob) return "blob";
  return "stream";
}

export function FileViewer({ source, className, renderFallback, onError }: FileViewerProps) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let active = true;
    setState({ status: "loading" });

    const run = async () => {
      try {
        const blob = await loadSourceToBlob(source, abortController.signal);
        const detection = await detectFileKind(blob);
        if (!active) return;
        if (detection.kind === "unsupported") {
          const error = new Error("Unsupported file type.");
          setState({ status: "error", error, reason: "unsupported" });
          onError?.(error, { stage: "detect", sourceType: sourceTypeOf(source) });
          return;
        }
        setState({ status: "ready", blob, detection });
      } catch (unknownError) {
        if (!active) return;
        const error = unknownError instanceof Error ? unknownError : new Error("Failed to load file source.");
        setState({ status: "error", error, reason: "error" });
        onError?.(error, { stage: "load", sourceType: sourceTypeOf(source) });
      }
    };

    void run();
    return () => {
      active = false;
      abortController.abort();
    };
  }, [source, onError]);

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

  const fallback = useMemo(() => {
    if (state.status !== "error") return null;
    if (renderFallback != null) return renderFallback(state.reason);
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-600">
        {state.reason === "unsupported" ? "Unsupported file type." : state.error.message}
      </div>
    );
  }, [renderFallback, state]);

  return (
    <div className={`flex h-full w-full min-h-0 min-w-0 flex-col rounded border border-slate-200 bg-white ${className ?? ""}`}>
      {state.status === "loading" && (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading file...</div>
      )}
      {state.status === "error" && fallback}
      {state.status === "ready" && (
        <>
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span>{state.detection.kind.toUpperCase()}</span>
            <span>{state.detection.mimeType || "unknown MIME"}</span>
            {objectUrl != null && (
              <a href={objectUrl} download className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700">
                Download
              </a>
            )}
          </div>
          <div className="min-h-0 flex-1">
            {state.detection.kind === "text" && <TextRenderer blob={state.blob} />}
            {state.detection.kind === "image" && objectUrl != null && <ImageRenderer objectUrl={objectUrl} />}
            {state.detection.kind === "spreadsheet" && <SpreadsheetRenderer blob={state.blob} />}
            {state.detection.kind === "pdf" && <PdfRenderer blob={state.blob} />}
            {state.detection.kind === "docx" && <DocxRenderer blob={state.blob} />}
          </div>
        </>
      )}
    </div>
  );
}
