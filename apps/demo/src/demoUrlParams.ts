export type DemoFileType =
  | "text"
  | "markdown"
  | "html"
  | "csv"
  | "image"
  | "tiffMulti"
  | "tiffLarge"
  | "pdf"
  | "docx"
  | "dotx"
  | "xlsx"
  | "xlsxReport"
  | "pptx"
  | "pptx5";
export type SourceMode = "url" | "blob" | "base64" | "stream";
export type DemoScenario = "normal" | "unsupported" | "error";
export type ChromeMode = "default" | "none" | "custom";

export type DemoControls = {
  fileType: DemoFileType;
  mode: SourceMode;
  scenario: DemoScenario;
  chromeMode: ChromeMode;
  /** 1-based PDF page to open when the document loads (`?page=`). */
  initialPage?: number;
};

const FILE_TYPES: readonly DemoFileType[] = [
  "text",
  "markdown",
  "html",
  "csv",
  "image",
  "tiffMulti",
  "tiffLarge",
  "pdf",
  "docx",
  "dotx",
  "xlsx",
  "xlsxReport",
  "pptx",
  "pptx5",
];
const SOURCE_MODES: readonly SourceMode[] = ["url", "blob", "base64", "stream"];
const SCENARIOS: readonly DemoScenario[] = ["normal", "unsupported", "error"];
const CHROME_MODES: readonly ChromeMode[] = ["default", "none", "custom"];

const DEFAULT_CONTROLS: DemoControls = {
  fileType: "text",
  mode: "url",
  scenario: "normal",
  chromeMode: "default",
};

function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

function parseInitialPage(search: URLSearchParams): number | undefined {
  const page = search.get("page");
  if (page == null) return undefined;
  const parsed = Number.parseInt(page, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return parsed;
}

export function parseDemoControls(search: URLSearchParams): DemoControls {
  const fileType = search.get("file");
  const mode = search.get("mode");
  const scenario = search.get("scenario");
  const chromeMode = search.get("chrome");

  return {
    fileType:
      fileType != null && isOneOf(fileType, FILE_TYPES)
        ? fileType
        : DEFAULT_CONTROLS.fileType,
    mode:
      mode != null && isOneOf(mode, SOURCE_MODES) ? mode : DEFAULT_CONTROLS.mode,
    scenario:
      scenario != null && isOneOf(scenario, SCENARIOS)
        ? scenario
        : DEFAULT_CONTROLS.scenario,
    chromeMode:
      chromeMode != null && isOneOf(chromeMode, CHROME_MODES)
        ? chromeMode
        : DEFAULT_CONTROLS.chromeMode,
    initialPage: parseInitialPage(search),
  };
}

export function readDemoControlsFromLocation(): DemoControls {
  return parseDemoControls(new URLSearchParams(window.location.search));
}

export function replaceDemoControlsInLocation(controls: DemoControls): void {
  const search = new URLSearchParams();
  search.set("file", controls.fileType);
  search.set("mode", controls.mode);
  search.set("scenario", controls.scenario);
  search.set("chrome", controls.chromeMode);
  if (controls.initialPage != null) {
    search.set("page", String(controls.initialPage));
  }
  const next = `${window.location.pathname}?${search.toString()}`;
  window.history.replaceState(window.history.state, "", next);
}
