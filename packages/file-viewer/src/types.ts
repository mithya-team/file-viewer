import type { ComponentType, ReactNode } from "react";

export type FileViewerSource = string | Blob | ReadableStream<Uint8Array>;

export type FileKind =
  | "image"
  | "pdf"
  | "spreadsheet"
  | "docx"
  | "pptx"
  | "text"
  | "markdown"
  | "html"
  | "unsupported";

export type DetectionResult = {
  [K in FileKind]: {
    kind: K;
    mimeType: string;
  };
}[FileKind];

export interface FileViewerErrorContext {
  stage: "load" | "detect" | "render";
  sourceType: "string" | "blob" | "stream";
}

export type PageNavigateEvent = {
  page: number;
  reason: "programmatic";
};

export type PageNavigateListener = (event: PageNavigateEvent) => void;

type ChromeFileBase<K extends FileKind> = {
  kind: K;
  mimeType: string;
  downloadUrl: string | null;
};

export type ImageChromeApi = {
  file: ChromeFileBase<"image">;
  image: {
    zoom: number;
    zoomIn: () => void;
    zoomOut: () => void;
    setZoom: (zoom: number) => void;
    stepZoomIn: () => void;
    resetZoom: () => void;
    page: number;
    pageCount: number;
    geometryReady: boolean;
    canPrev: boolean;
    canNext: boolean;
    prevPage: () => void;
    nextPage: () => void;
    setPage: (page: number) => void;
    subscribePageNavigate: (listener: PageNavigateListener) => () => void;
  };
};

export type PDFChromeApi = {
  file: ChromeFileBase<"pdf">;
  pdf: {
    page: number;
    pageCount: number;
    geometryReady: boolean;
    zoom: number;
    canPrev: boolean;
    canNext: boolean;
    prevPage: () => void;
    nextPage: () => void;
    setPage: (page: number) => void;
    subscribePageNavigate: (listener: PageNavigateListener) => () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    setZoom: (zoom: number) => void;
  };
};

export type SpreadsheetChromeApi = {
  file: ChromeFileBase<"spreadsheet">;
  spreadsheet: {
    sheetNames?: string[];
    activeSheetIndex?: number;
    setActiveSheetIndex?: (index: number) => void;
  };
};

export type DocxChromeApi = {
  file: ChromeFileBase<"docx">;
};

export type PptxChromeApi = {
  file: ChromeFileBase<"pptx">;
  pptx: {
    page: number;
    pageCount: number;
    geometryReady: boolean;
    zoom: number;
    canPrev: boolean;
    canNext: boolean;
    prevPage: () => void;
    nextPage: () => void;
    setPage: (page: number) => void;
    subscribePageNavigate: (listener: PageNavigateListener) => () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    setZoom: (zoom: number) => void;
  };
};

export type TextChromeApi = {
  file: ChromeFileBase<"text">;
};

export type MarkdownChromeApi = {
  file: ChromeFileBase<"markdown">;
};

export type HtmlChromeApi = {
  file: ChromeFileBase<"html">;
};

export type UnsupportedChromeApi = {
  file: ChromeFileBase<"unsupported">;
};

export type FileViewerChromeApi =
  | ImageChromeApi
  | PDFChromeApi
  | SpreadsheetChromeApi
  | DocxChromeApi
  | PptxChromeApi
  | TextChromeApi
  | MarkdownChromeApi
  | HtmlChromeApi
  | UnsupportedChromeApi;

export type FileViewerChrome =
  | "default"
  | "none"
  | ComponentType<{ api: FileViewerChromeApi }>;

export interface FileViewerProps {
  source: FileViewerSource;
  className?: string;
  chrome?: FileViewerChrome;
  /**
   * When true, `text/html` sources render in a sandboxed iframe (`allow-scripts`,
   * no `allow-same-origin`). Default false: HTML falls back to the text renderer.
   * Only enable for content you trust — author scripts run and may fetch remote subresources.
   */
  enableHtmlPreview?: boolean;
  renderFallback?: (reason: "unsupported" | "error") => ReactNode;
  onError?: (error: Error, context: FileViewerErrorContext) => void;
}
