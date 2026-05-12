import type { FileViewerChromeApi } from "@file-viewer/react";

interface DemoViewerChromeProps {
  api: FileViewerChromeApi;
}

type DemoPdfChromeApi = Extract<FileViewerChromeApi, { file: { kind: "pdf" } }>;
type DemoSpreadsheetChromeApi = Extract<FileViewerChromeApi, { file: { kind: "spreadsheet" } }>;

export function DemoViewerChrome({ api }: DemoViewerChromeProps) {
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
            className="rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400 disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            {api.pdf.page} / {api.pdf.pageCount}
          </span>
          <button
            type="button"
            onClick={api.pdf.nextPage}
            disabled={!api.pdf.canNext}
            className="rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400 disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            onClick={api.pdf.zoomOut}
            className="rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
          >
            -
          </button>
          <span>{api.pdf.zoom}%</span>
          <button
            type="button"
            onClick={api.pdf.zoomIn}
            className="rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
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
                className={`rounded border px-2 py-1 text-slate-100 transition ${
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
          className="ml-auto rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
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

const isSpreadSheetChromeApi = (
  api: FileViewerChromeApi,
): api is DemoSpreadsheetChromeApi => {
  return api.file.kind === "spreadsheet";
};
