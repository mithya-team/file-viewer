export { FileViewer } from "./FileViewer";

export type {
  DetectionResult,
  DocxChromeApi,
  FileKind,
  FileViewerChrome,
  FileViewerChromeApi,
  FileViewerErrorContext,
  FileViewerProps,
  FileViewerSource,
  ImageChromeApi,
  PageNavigateEvent,
  PageNavigateListener,
  PDFChromeApi,
  SpreadsheetChromeApi,
  PptxChromeApi,
  TextChromeApi,
  UnsupportedChromeApi,
} from "./types";

export type { StringSourceKind } from "./source/classifyStringSource";

export type { DocxRendererProps } from "./renderers/DocxRenderer";
export type { ImageRendererProps } from "./renderers/ImageRenderer";
export type { PdfRendererProps } from "./renderers/PdfRenderer";
export type { PptxRendererProps } from "./renderers/PptxRenderer";
export type { SpreadsheetRendererProps } from "./renderers/SpreadsheetRenderer";
export type { TextRendererProps } from "./renderers/TextRenderer";

export type { PdfSearchMatch, PdfSearchState } from "./renderers/pdf/pdfSearchTypes";
