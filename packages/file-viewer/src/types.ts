import type { ComponentType, ReactNode } from "react";

export type FileViewerSource = string | Blob | ReadableStream<Uint8Array>;

export type FileKind =
  | "image"
  | "pdf"
  | "spreadsheet"
  | "docx"
  | "text"
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

type ChromeFileBase<K extends FileKind> = {
  kind: K;
  mimeType: string;
  downloadUrl: string | null;
};

export type FileViewerChromeApi =
  | {
      file: ChromeFileBase<"image">;
    }
  | {
      file: ChromeFileBase<"pdf">;
      pdf: {
        page: number;
        pageCount: number;
        zoom: number;
        canPrev: boolean;
        canNext: boolean;
        prevPage: () => void;
        nextPage: () => void;
        setPage: (page: number) => void;
        zoomIn: () => void;
        zoomOut: () => void;
        setZoom: (zoom: number) => void;
      };
    }
  | {
      file: ChromeFileBase<"spreadsheet">;
      spreadsheet: {
        sheetNames?: string[];
        activeSheetIndex?: number;
        setActiveSheetIndex?: (index: number) => void;
      };
    }
  | {
      file: ChromeFileBase<"docx">;
    }
  | {
      file: ChromeFileBase<"text">;
    }
  | {
      file: ChromeFileBase<"unsupported">;
    };

export type FileViewerChrome =
  | "default"
  | "none"
  | ComponentType<{ api: FileViewerChromeApi }>;

export interface FileViewerProps {
  source: FileViewerSource;
  className?: string;
  chrome?: FileViewerChrome;
  renderFallback?: (reason: "unsupported" | "error") => ReactNode;
  onError?: (error: Error, context: FileViewerErrorContext) => void;
}
