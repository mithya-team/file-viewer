import type { FileViewerChromeApi, PDFChromeApi } from "@file-viewer/react";
import { DemoPdfPageInput } from "./DemoPdfPageInput";

interface DemoViewerChromeProps {
  api: FileViewerChromeApi;
  initialPage?: number;
}

type DemoPdfChromeApi = Extract<FileViewerChromeApi, { file: { kind: "pdf" } }>;
type DemoImageChromeApi = Extract<FileViewerChromeApi, { file: { kind: "image" } }>;
type DemoPptxChromeApi = Extract<FileViewerChromeApi, { file: { kind: "pptx" } }>;
type DemoSpreadsheetChromeApi = Extract<FileViewerChromeApi, { file: { kind: "spreadsheet" } }>;

export function DemoViewerChrome({ api, initialPage }: DemoViewerChromeProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-t-lg border-b border-slate-300 bg-slate-900 px-3 py-2 text-xs text-slate-100">
      <span className="font-semibold uppercase tracking-wide">
        {api.file.kind}
      </span>
      <span className="text-slate-300">
        {api.file.mimeType || "unknown MIME"}
      </span>
      {isPDFChromeApi(api) && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={api.pdf.prevPage}
            disabled={!api.pdf.canPrev}
            className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <DemoPdfPageInput
            key={api.file.downloadUrl ?? "pdf"}
            documentKey={api.file.downloadUrl ?? undefined}
            initialPage={initialPage}
            page={api.pdf.page}
            pageCount={api.pdf.pageCount}
            setPage={api.pdf.setPage}
          />
          <span>/ {api.pdf.pageCount}</span>
          <button
            type="button"
            onClick={api.pdf.nextPage}
            disabled={!api.pdf.canNext}
            className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            onClick={api.pdf.zoomOut}
            className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
          >
            -
          </button>
          <span>{api.pdf.zoom}%</span>
          <button
            type="button"
            onClick={api.pdf.zoomIn}
            className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
          >
            +
          </button>
        </div>
      )}
      {isImageChromeApi(api) && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {api.image.pageCount > 1 && (
            <>
              <button
                type="button"
                onClick={api.image.prevPage}
                disabled={!api.image.canPrev}
                className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <DemoPdfPageInput
                key={api.file.downloadUrl ?? "tiff"}
                documentKey={api.file.downloadUrl ?? undefined}
                initialPage={initialPage}
                page={api.image.page}
                pageCount={api.image.pageCount}
                setPage={api.image.setPage}
              />
              <span>/ {api.image.pageCount}</span>
              <button
                type="button"
                onClick={api.image.nextPage}
                disabled={!api.image.canNext}
                className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </>
          )}
          <button
            type="button"
            onClick={api.image.zoomOut}
            className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
          >
            -
          </button>
          <span>{api.image.zoom}%</span>
          <button
            type="button"
            onClick={api.image.zoomIn}
            className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
          >
            +
          </button>
        </div>
      )}
      {isPptxChromeApi(api) && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={api.pptx.prevPage}
            disabled={!api.pptx.canPrev}
            className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <DemoPdfPageInput
            key={api.file.downloadUrl ?? "pptx"}
            documentKey={api.file.downloadUrl ?? undefined}
            initialPage={initialPage}
            page={api.pptx.page}
            pageCount={api.pptx.pageCount}
            setPage={api.pptx.setPage}
          />
          <span>/ {api.pptx.pageCount}</span>
          <button
            type="button"
            onClick={api.pptx.nextPage}
            disabled={!api.pptx.canNext}
            className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            onClick={api.pptx.zoomOut}
            className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
          >
            -
          </button>
          <span>{api.pptx.zoom}%</span>
          <button
            type="button"
            onClick={api.pptx.zoomIn}
            className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
          >
            +
          </button>
        </div>
      )}
      {isSpreadSheetChromeApi(api) && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {api.file.mimeType === "text/csv" ? (
            <span className="text-slate-300">CSV has no workbook controls</span>
          ) : (
            api.spreadsheet.sheetNames?.map((sheetName: string, index: number) => (
              <button
                key={sheetName}
                type="button"
                onClick={() => api.spreadsheet.setActiveSheetIndex?.(index)}
                className={`cursor-pointer rounded border px-2 py-1 text-slate-100 transition ${
                  index === api.spreadsheet.activeSheetIndex
                    ? "border-slate-200 bg-slate-700"
                    : "border-slate-600 hover:border-slate-400"
                }`}
              >
                {sheetName}
              </button>
            ))
          )}
        </div>
      )}
      {api.file.downloadUrl != null && (
        <a
          href={api.file.downloadUrl}
          download
          className="ml-auto cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
        >
          Download
        </a>
      )}
    </div>
  );
}

const isPDFChromeApi = (api: FileViewerChromeApi): api is DemoPdfChromeApi => {
  return api.file.kind === "pdf";
};

const isImageChromeApi = (api: FileViewerChromeApi): api is DemoImageChromeApi => {
  return api.file.kind === "image";
};

const isPptxChromeApi = (api: FileViewerChromeApi): api is DemoPptxChromeApi => {
  return api.file.kind === "pptx";
};

const isSpreadSheetChromeApi = (
  api: FileViewerChromeApi,
): api is DemoSpreadsheetChromeApi => {
  return api.file.kind === "spreadsheet";
};
