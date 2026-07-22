## Context

Markdown always mounts `MarkdownRenderer`. HTML mounts `HtmlRenderer` when `enableHtmlPreview`, else `TextRenderer`. Chrome APIs for both are file-metadata only. Default chrome shows kind/MIME/download with no view controls.

Consumers need Preview | Source without downloading. Decisions locked in explore: shell-owned mode, MD always toggleable, HTML toggle only when `enableHtmlPreview`, plain monospace via `TextRenderer`, default preview, labels Preview|Source, optional `html?` chrome branch, export `ContentViewMode`, disable-preview mid-mount forces text + drops toggle.

## Goals / Non-Goals

**Goals:**

- Shell `viewMode` + chrome API for MD/HTML
- Source = reuse `TextRenderer`
- Default chrome Preview | Source
- Public `ContentViewMode`
- Spec/docs updates for chrome + routing

**Non-Goals:**

- Syntax highlighting
- FileViewer-level controlled `viewMode` prop
- Source mode for other formats (docx, pdf, etc.)
- Changing HTML sandbox / `enableHtmlPreview` security model
- Scroll-position restore across toggle

## Decisions

### 1. Shell owns `viewMode`; chrome exposes setters

**Choice:** `useState<ContentViewMode>("preview")` in `FileViewer`. Pass into `createChromeApi`. Route ready content on `viewMode`.

**Alt:** Per-renderer internal toggle — rejects; breaks custom chrome.

### 2. Optional `html` chrome branch (spreadsheet CSV pattern)

**Choice:**
```ts
MarkdownChromeApi = { file, markdown: { viewMode, setViewMode } } // always
HtmlChromeApi = { file, html?: { viewMode, setViewMode } } // only if enableHtmlPreview
```

**Alt:** Always-present `html` with no-op — worse for default chrome gating.

### 3. Routing matrix

| kind | enableHtmlPreview | viewMode | mount |
|------|-------------------|----------|-------|
| markdown | n/a | preview | MarkdownRenderer |
| markdown | n/a | source | TextRenderer |
| html | false | * | TextRenderer |
| html | true | preview | HtmlRenderer |
| html | true | source | TextRenderer |

### 4. Reset + disable-preview

- Reset `viewMode` → `"preview"` when `source` identity changes or `detection.kind` changes (effect when ready state updates).
- `enableHtmlPreview` true→false: omit `html` from chrome; always TextRenderer (ignore stale viewMode).

### 5. Default chrome UI

Two `ViewerButton`s (Preview / Source) with `active` when selected — same pattern as spreadsheet sheet tabs. Show for `api.file.kind === "markdown"` always; for `"html"` only when `api.html` defined.

### 6. No new deps

Reuse `TextRenderer`. Export type from `types.ts` + `index.ts`.

## Risks / Trade-offs

- **[Spec churn]** Existing “markdown MUST NOT mount TextRenderer” inverted for source → update specs/tests explicitly.
- **[Stale viewMode when HTML preview disabled]** → Force text path; omit chrome branch.
- **[Cross-file mode leak]** → Reset on source/kind change.
- **[Custom chrome breakage]** Adding required `markdown` field is a type-level **BREAKING** for consumers who construct/narrow chrome — acceptable; runtime file-only consumers still work if they only read `file`.

## Migration Plan

- Ship as package type surface change: consumers typing `MarkdownChromeApi` must expect `markdown` controls.
- HTML remains backward compatible: without `enableHtmlPreview` behavior unchanged; with it, default still preview.

## Open Questions

None — all decided in explore.
