import { ReactDocxViewer, useDocxModel } from "@extend-ai/react-docx";
import { useEffect, useRef, useState } from "react";
import { ViewerStatus } from "../primitives/ViewerStatus";
import { RENDERER_VIEWPORT_CLASS } from "./rendererViewport";

export interface DocxRendererProps {
  blob: Blob;
  onError: (error: Error) => void;
}

function normalizeRenderError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("Failed to render DOCX/DOTX.");
}

/** Internal read-only Extend DOCX adapter over FileViewer's buffered source. */
export function DocxRenderer({ blob, onError }: DocxRendererProps) {
  const [file, setFile] = useState<ArrayBuffer | undefined>();
  const { model, isLoading, error } = useDocxModel(file);
  const lastErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    let disposed = false;
    setFile(undefined);
    void blob.arrayBuffer().then(
      (buffer) => {
        if (!disposed) setFile(buffer);
      },
      (readError) => {
        if (!disposed) onError(normalizeRenderError(readError));
      },
    );
    return () => {
      disposed = true;
    };
  }, [blob, onError]);

  useEffect(() => {
    if (error == null || error === lastErrorRef.current) return;
    lastErrorRef.current = error;
    onError(normalizeRenderError(error));
  }, [error, onError]);

  if (file == null || isLoading || model == null) {
    return <div className={RENDERER_VIEWPORT_CLASS}><ViewerStatus centered>Loading document...</ViewerStatus></div>;
  }

  return (
    <div className={`${RENDERER_VIEWPORT_CLASS} [background-color:var(--file-viewer-surface-muted,_#f8fafc)]`}>
      <ReactDocxViewer model={model} />
    </div>
  );
}
