import type { ReactNode } from "react";

export type FileViewerSource = string | Blob | ReadableStream<Uint8Array>;

export type FileKind =
  | "image"
  | "pdf"
  | "spreadsheet"
  | "docx"
  | "text"
  | "unsupported";

export interface DetectionResult {
  kind: FileKind;
  mimeType: string;
}

export interface FileViewerErrorContext {
  stage: "load" | "detect" | "render";
  sourceType: "string" | "blob" | "stream";
}

export interface FileViewerProps {
  source: FileViewerSource;
  className?: string;
  renderFallback?: (reason: "unsupported" | "error") => ReactNode;
  onError?: (error: Error, context: FileViewerErrorContext) => void;
}
