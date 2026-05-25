import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileViewer,
  type FileViewerChromeApi,
  type FileViewerSource,
} from "@file-viewer/react";
import { DemoViewerChrome } from "./DemoViewerChrome";
import {
  readDemoControlsFromLocation,
  replaceDemoControlsInLocation,
  type ChromeMode,
  type DemoControls,
  type DemoFileType,
  type DemoScenario,
  type SourceMode,
} from "./demoUrlParams";

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
  pdf: "/sample-files/Sample-Penetration-Test-Report-PurpleSec.pdf",
  docx: "/sample-files/dataops_sample_template_v1.docx",
  dotx: "/sample-files/example.dotx",
  xlsx: "/sample-files/Label%20Report%20-%20Anti-assignment,%20CIC%20(Group%203).xlsx",
};

const SCENARIO_LABELS: Record<DemoScenario, string> = {
  normal: "Normal",
  unsupported: "Unsupported",
  error: "Error",
};
const UNSUPPORTED_BYTES = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]);
const UNSUPPORTED_BASE64 = "AAECAwQF";

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

function createStreamFromBytes(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function createFailingStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.error(new Error("Demo stream failure."));
    },
  });
}

function buildUnsupportedSource(mode: SourceMode): FileViewerSource {
  switch (mode) {
    case "url":
      return `data:application/octet-stream;base64,${UNSUPPORTED_BASE64}`;
    case "blob":
      return new Blob([UNSUPPORTED_BYTES], { type: "application/octet-stream" });
    case "base64":
      return UNSUPPORTED_BASE64;
    case "stream":
      return createStreamFromBytes(UNSUPPORTED_BYTES);
  }
}

function buildErrorSource(mode: SourceMode): FileViewerSource {
  switch (mode) {
    case "url":
      return "https://example.com/failure";
    case "base64":
      return "definitely not a valid viewer source";
    case "stream":
      return createFailingStream();
    case "blob":
      throw new Error("Forced error flow is only available for URL, Base64, or Stream mode.");
  }
}

async function buildSource(
  fileType: DemoFileType,
  mode: SourceMode,
  scenario: DemoScenario,
): Promise<FileViewerSource> {
  if (scenario === "unsupported") {
    return buildUnsupportedSource(mode);
  }
  if (scenario === "error") {
    return buildErrorSource(mode);
  }

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
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (mode === "stream") {
    return createStreamFromBytes(bytes);
  }

  return toBase64FromBytes(bytes);
}

export default function App() {
  const [controls, setControls] = useState<DemoControls>(readDemoControlsFromLocation);
  const { fileType, mode, scenario, chromeMode, initialPage } = controls;
  const [source, setSource] = useState<FileViewerSource | null>(null);
  const [status, setStatus] = useState<string>("Preparing source...");
  const [error, setError] = useState<string | null>(null);
  const [viewerEvent, setViewerEvent] = useState<string | null>(null);

  const applyControls = useCallback((next: DemoControls) => {
    setControls(next);
    replaceDemoControlsInLocation(next);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setControls(readDemoControlsFromLocation());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const resolvedSource = useMemo(() => {
    if (mode !== "url") return source;
    if (typeof source !== "string") return source;
    return toAbsoluteFixtureUrl(source);
  }, [mode, source]);

  useEffect(() => {
    let active = true;
    setStatus("Preparing source...");
    setError(null);
    setViewerEvent(null);
    void buildSource(fileType, mode, scenario)
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
  }, [fileType, mode, scenario]);

  const modeButtons = useMemo(
    () =>
      (["url", "blob", "base64", "stream"] as SourceMode[]).map(
        (sourceMode) => (
          <button
            key={sourceMode}
            type="button"
            onClick={() => applyControls({ ...controls, mode: sourceMode })}
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
    [applyControls, controls, mode],
  );

  const scenarioButtons = useMemo(
    () =>
      (["normal", "unsupported", "error"] as DemoScenario[]).map((nextScenario) => (
        <button
          key={nextScenario}
          type="button"
          onClick={() => applyControls({ ...controls, scenario: nextScenario })}
          className={`w-full rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition ${
            nextScenario === scenario
              ? "border-slate-900 bg-slate-900 text-white shadow-sm"
              : "border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
          }`}
        >
          {SCENARIO_LABELS[nextScenario]}
        </button>
      )),
    [applyControls, controls, scenario],
  );

  const customChrome = useMemo(
    () =>
      function CustomDemoChrome({ api }: { api: FileViewerChromeApi }) {
        return <DemoViewerChrome api={api} initialPage={initialPage} />;
      },
    [initialPage],
  );

  const chromeButtons = useMemo(
    () =>
      (["default", "none", "custom"] as ChromeMode[]).map((nextChromeMode) => (
        <button
          key={nextChromeMode}
          type="button"
          onClick={() => applyControls({ ...controls, chromeMode: nextChromeMode })}
          className={`w-full rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition ${
            nextChromeMode === chromeMode
              ? "border-slate-900 bg-slate-900 text-white shadow-sm"
              : "border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
          }`}
        >
          {nextChromeMode}
        </button>
      )),
    [applyControls, chromeMode, controls],
  );

  return (
    <div className="flex h-dvh bg-slate-50 text-slate-950">
      <main className="min-h-0 min-w-0 flex-1 p-4">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
            <strong className="font-semibold text-slate-950">
              FileViewer demo
            </strong>
            <span>
              File: {FILE_LABELS[fileType]} | Source: {mode.toUpperCase()} | Scenario: {SCENARIO_LABELS[scenario]} | Chrome: {chromeMode.toUpperCase()}
              {initialPage != null ? ` | Page: ${initialPage}` : ""} | {status}
            </span>
          </div>
          {viewerEvent != null && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {viewerEvent}
            </div>
          )}
          <div className="relative min-h-0 flex-1">
            {error != null ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            ) : resolvedSource != null ? (
              <FileViewer
                className="absolute inset-0 min-h-0"
                source={resolvedSource}
                chrome={chromeMode === "custom" ? customChrome : chromeMode}
                onError={(nextError, context) => {
                  setViewerEvent(`${context.stage}: ${nextError.message}`);
                }}
                renderFallback={(reason) => (
                  <div className="flex h-full items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Demo fallback: {reason}
                  </div>
                )}
              />
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
                onClick={() => applyControls({ ...controls, fileType: nextType })}
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
            Scenario
          </div>
          <div className="grid gap-1.5">{scenarioButtons}</div>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold text-slate-700">
            Source Mode
          </div>
          <div className="grid gap-1.5">{modeButtons}</div>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold text-slate-700">
            Chrome Mode
          </div>
          <div className="grid gap-1.5">{chromeButtons}</div>
        </div>
      </aside>
    </div>
  );
}
