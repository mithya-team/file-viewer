export type CitationDocKind = "pdf" | "pptx" | "tiff";

export type CitationDemoControls = {
  kind: CitationDocKind;
  /** 1-based citation target page. */
  page: number;
};

const KINDS: readonly CitationDocKind[] = ["pdf", "pptx", "tiff"];

const DEFAULT_CONTROLS: CitationDemoControls = {
  kind: "pdf",
  page: 3,
};

function parseKind(raw: string | null): CitationDocKind {
  if (raw === "pdf" || raw === "pptx" || raw === "tiff") return raw;
  return DEFAULT_CONTROLS.kind;
}

function parsePage(raw: string | null): number {
  if (raw == null || raw === "") return DEFAULT_CONTROLS.page;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_CONTROLS.page;
  return parsed;
}

export function readCitationControlsFromLocation(): CitationDemoControls {
  const search = new URLSearchParams(window.location.search);
  return {
    kind: parseKind(search.get("kind")),
    page: parsePage(search.get("page")),
  };
}

export function replaceCitationControlsInLocation(controls: CitationDemoControls) {
  const search = new URLSearchParams();
  search.set("kind", controls.kind);
  search.set("page", String(controls.page));
  const next = `${window.location.pathname}?${search.toString()}`;
  window.history.replaceState(null, "", next);
}

export function isCitationDocKind(value: string): value is CitationDocKind {
  return (KINDS as readonly string[]).includes(value);
}

export { KINDS as CITATION_DOC_KINDS };
