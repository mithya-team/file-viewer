import type { ReactNode } from "react";
import { PdfPageInput } from "./primitives/PdfPageInput";
import { ViewerButton } from "./primitives/ViewerButton";
import type { FileViewerChromeApi, ImageChromeApi, PDFChromeApi, SpreadsheetChromeApi } from "./types";

interface FileViewerDefaultChromeProps {
  api: FileViewerChromeApi;
}

function isPdfChromeApi(api: FileViewerChromeApi): api is PDFChromeApi {
  return api.file.kind === "pdf";
}

function isImageChromeApi(api: FileViewerChromeApi): api is ImageChromeApi {
  return api.file.kind === "image";
}

function isSpreadsheetChromeApi(
  api: FileViewerChromeApi,
): api is SpreadsheetChromeApi {
  return api.file.kind === "spreadsheet";
}

export function FileViewerDefaultChrome({ api }: FileViewerDefaultChromeProps) {
  if (api.file.kind === "unsupported") return null;

  let controls: ReactNode = null;

  if (isPdfChromeApi(api)) {
    controls = (
      <div className="flex items-center gap-2">
        <ViewerButton onClick={api.pdf.prevPage} disabled={!api.pdf.canPrev}>
          Prev
        </ViewerButton>
        <PdfPageInput
          key={api.pdf.page}
          page={api.pdf.page}
          pageCount={api.pdf.pageCount}
          setPage={api.pdf.setPage}
        />
        <span className="text-(--file-viewer-foreground,#334155)">
          / {api.pdf.pageCount}
        </span>
        <ViewerButton onClick={api.pdf.nextPage} disabled={!api.pdf.canNext}>
          Next
        </ViewerButton>
        <ViewerButton onClick={api.pdf.zoomOut}>
          -
        </ViewerButton>
        <span className="text-(--file-viewer-foreground,#334155)">{api.pdf.zoom}%</span>
        <ViewerButton onClick={api.pdf.zoomIn}>
          +
        </ViewerButton>
      </div>
    );
  } else if (isImageChromeApi(api)) {
    controls = (
      <div className="flex items-center gap-2">
        {api.image.pageCount > 1 && (
          <>
            <ViewerButton onClick={api.image.prevPage} disabled={!api.image.canPrev}>
              Prev
            </ViewerButton>
            <PdfPageInput
              key={api.image.page}
              page={api.image.page}
              pageCount={api.image.pageCount}
              setPage={api.image.setPage}
            />
            <span className="text-(--file-viewer-foreground,#334155)">
              / {api.image.pageCount}
            </span>
            <ViewerButton onClick={api.image.nextPage} disabled={!api.image.canNext}>
              Next
            </ViewerButton>
          </>
        )}
        <ViewerButton onClick={api.image.zoomOut}>-</ViewerButton>
        <span className="text-(--file-viewer-foreground,#334155)">{api.image.zoom}%</span>
        <ViewerButton onClick={api.image.zoomIn}>+</ViewerButton>
      </div>
    );
  } else if (isSpreadsheetChromeApi(api)) {
    controls =
      api.file.mimeType === "text/csv" || api.spreadsheet.sheetNames == null || api.spreadsheet.sheetNames.length === 0 ? null : (
        <div className="flex flex-wrap gap-2">
          {api.spreadsheet.sheetNames.map((sheetName: string, index: number) => (
            <ViewerButton
              key={sheetName}
              onClick={() => api.spreadsheet.setActiveSheetIndex?.(index)}
              active={index === api.spreadsheet.activeSheetIndex}
            >
              {sheetName}
            </ViewerButton>
          ))}
        </div>
      );
  }

  return (
    <div
      data-file-viewer-chrome="default"
      className="flex flex-wrap items-center gap-3 border-b border-(--file-viewer-border,#cbd5e1) bg-(--file-viewer-surface-muted,#f8fafc) px-3 py-2 text-(--file-viewer-muted,#64748b) text-xs"
    >
      <span>{api.file.kind.toUpperCase()}</span>
      <span>{api.file.mimeType || "unknown MIME"}</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {controls}
        {api.file.downloadUrl != null && (
          <a
            href={api.file.downloadUrl}
            download
            className="inline-flex cursor-pointer items-center justify-center rounded border border-(--file-viewer-border,#cbd5e1) bg-(--file-viewer-surface,#ffffff) px-2 py-1 text-(--file-viewer-foreground,#334155) text-xs"
          >
            Download
          </a>
        )}
      </div>
    </div>
  );
}
