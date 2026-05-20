export type DemoFileType = "text" | "csv" | "image" | "pdf" | "docx" | "dotx" | "xlsx";
export type SourceMode = "url" | "blob" | "base64" | "stream";
export type DemoScenario = "normal" | "unsupported" | "error";
export type ChromeMode = "default" | "none" | "custom";

export type DemoControls = {
  fileType: DemoFileType;
  mode: SourceMode;
  scenario: DemoScenario;
  chromeMode: ChromeMode;
};

const FILE_TYPES: readonly DemoFileType[] = [
  "text",
  "csv",
  "image",
  "pdf",
  "docx",
  "dotx",
  "xlsx",
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
  const next = `${window.location.pathname}?${search.toString()}`;
  window.history.replaceState(window.history.state, "", next);
}
