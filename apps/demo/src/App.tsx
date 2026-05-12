import { useEffect, useMemo, useState } from "react";
import { FileViewer, type FileViewerSource } from "@file-viewer/react";

type DemoFileType = "text" | "csv" | "image" | "pdf" | "docx" | "dotx" | "xlsx";
type SourceMode = "url" | "blob" | "base64" | "stream";

const FILE_LABELS: Record<DemoFileType, string> = {
  text: "Text",
  csv: "CSV",
  image: "Image",
  pdf: "PDF",
  docx: "DOCX",
  dotx: "DOTX",
  xlsx: "XLSX",
};

const FILE_PATHS: Record<DemoFileType, string> = {
  text: "/sample-files/2ThemartComInc_19990826_10-12G_EX-10.10_6700288_EX-10.10_Co-Branding%20Agreement_%20Agency%20Agreement.txt",
  csv: "/sample-files/blank%20rfp%20-shortened.csv",
  image: "/sample-files/mountains.jpg",
  pdf: "/sample-files/CreditcardscomInc_20070810_S-1_EX-10.33_362297_EX-10.33_Affiliate%20Agreement.pdf",
  docx: "/sample-files/file-sample_100kB.docx",
  dotx: "/sample-files/example.dotx",
  xlsx: "/sample-files/Label%20Report%20-%20Anti-assignment,%20CIC%20(Group%203).xlsx",
};

async function toBase64FromBytes(bytes: Uint8Array): Promise<string> {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(
      index,
      Math.min(index + chunkSize, bytes.length),
    );
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function toAbsoluteFixtureUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

async function buildSource(
  fileType: DemoFileType,
  mode: SourceMode,
): Promise<FileViewerSource> {
  const path = FILE_PATHS[fileType];
  const absoluteUrl = toAbsoluteFixtureUrl(path);
  if (mode === "url") return absoluteUrl;

  const response = await fetch(absoluteUrl);
  if (!response.ok) {
    throw new Error(
      `Fixture fetch failed (${response.status}) for ${absoluteUrl}`,
    );
  }

  if (mode === "blob") {
    return response.blob();
  }
  if (mode === "stream") {
    if (response.body == null) {
      throw new Error("ReadableStream is not available for this response.");
    }
    return response.body;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  return toBase64FromBytes(bytes);
}

export default function App() {
  const [fileType, setFileType] = useState<DemoFileType>("text");
  const [mode, setMode] = useState<SourceMode>("url");
  const [source, setSource] = useState<FileViewerSource | null>(null);
  const [status, setStatus] = useState<string>("Preparing source...");
  const [error, setError] = useState<string | null>(null);

  const resolvedSource = useMemo(() => {
    if (mode !== "url") return source;
    if (typeof source !== "string") return source;
    return toAbsoluteFixtureUrl(source);
  }, [mode, source]);

  useEffect(() => {
    let active = true;
    setStatus("Preparing source...");
    setError(null);
    void buildSource(fileType, mode)
      .then((nextSource) => {
        if (!active) return;
        setSource(nextSource);
        setStatus("Ready");
      })
      .catch((sourceError) => {
        if (!active) return;
        setSource(null);
        setError(
          sourceError instanceof Error
            ? sourceError.message
            : "Failed to prepare source.",
        );
      });
    return () => {
      active = false;
    };
  }, [fileType, mode]);

  const modeButtons = useMemo(
    () =>
      (["url", "blob", "base64", "stream"] as SourceMode[]).map(
        (sourceMode) => (
          <button
            key={sourceMode}
            type="button"
            onClick={() => setMode(sourceMode)}
            className={`w-full rounded-md border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
              sourceMode === mode
                ? "border-slate-400 bg-slate-200 text-slate-950"
                : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            {sourceMode}
          </button>
        ),
      ),
    [mode],
  );

  return (
    <div className="flex h-dvh bg-slate-50 text-slate-950">
      <main className="min-w-0 flex-1 p-4">
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
            <strong className="font-semibold text-slate-950">
              FileViewer demo
            </strong>
            <span>
              File: {FILE_LABELS[fileType]} | Source: {mode.toUpperCase()} |{" "}
              {status}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            {error != null ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            ) : resolvedSource != null ? (
              <FileViewer source={resolvedSource} />
            ) : (
              <div className="text-[13px] text-slate-500">
                Preparing source...
              </div>
            )}
          </div>
        </div>
      </main>
      <aside className="flex w-[260px] shrink-0 flex-col gap-3.5 border-l border-slate-300 bg-white p-3 shadow-sm">
        <div>
          <div className="mb-2 text-xs font-bold text-slate-700">
            File Type
          </div>
          <div className="grid gap-1.5">
            {(Object.keys(FILE_LABELS) as DemoFileType[]).map((nextType) => (
              <button
                key={nextType}
                type="button"
                onClick={() => setFileType(nextType)}
                className={`w-full rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition ${
                  nextType === fileType
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                {FILE_LABELS[nextType]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold text-slate-700">
            Source Mode
          </div>
          <div className="grid gap-1.5">{modeButtons}</div>
        </div>
      </aside>
    </div>
  );
}
