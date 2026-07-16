## Context

`detectFileKind` routes any `text/*` (except CSV→spreadsheet) plus a few application textual MIME types to `kind: "text"` when bytes pass `isProbablyText`. `text/markdown` therefore lands in `TextRenderer` as raw monospace source.

Invariants require: magic bytes first, loaded MIME second; no extension sniffing; no text content heuristics for routing; loaded document HTML must be sanitized or produced only through a trusted render path with understood limits. Public API stays `FileViewer` + types only.

## Goals / Non-Goals

**Goals:**

- MIME-only `markdown` detection for `text/markdown` and `text/x-markdown` (+ `isProbablyText`).
- Internal `MarkdownRenderer`: GFM render (headings, lists, links, tables, strikethrough, task lists, autolink).
- Sanitize before any HTML reaches the DOM; strip scripts and unsafe URLs.
- New `FileKind: "markdown"` + `MarkdownChromeApi` (file + download only).
- Docs/README note that servers serving `.md` as `text/plain` stay on the text path until MIME is correct.

**Non-Goals:**

- Content sniffing / extension-based routing (defer until needed).
- Syntax highlighting, front-matter special handling, in-document search.
- Allowing arbitrary raw HTML embedded in markdown (sanitize strips).
- Worker offload; progressive parse.
- Custom renderer registration.

## Decisions

### 1. New `FileKind: "markdown"` (not branch inside text)

**Choice:** Extend `FileKind` / `DetectionResult` with `markdown`; dedicated renderer + chrome API.

**Rationale:** Distinct presentation from plain text; keeps exhaustiveness and chrome discrimination clean (same pattern as pptx vs docx).

**Alternatives:** Branch on `mimeType` inside `TextRenderer` — smaller diff, leaky chrome/`kind` semantics. Rejected.

### 2. MIME-only detection; sniffing deferred

**Choice:** Route only when `normalizedMime` is `text/markdown` or `text/x-markdown` and `isProbablyText(sampleBytes)`. Place this branch **before** the generic `text/*` fallback. Unlabeled blobs stay unsupported.

**Rationale:** Matches invariants and agreed trial stance. If hosts commonly send `text/plain` for `.md`, revisit content sniffing in a follow-up change.

**Alternatives:** Content heuristics (e.g. ATX headings) — deferred.

### 3. `react-markdown` + `remark-gfm` + `rehype-sanitize`

**Choice:** Add those three as package runtime deps (pin compatible versions at install time via workspace package manager).

**Rationale:** React element tree from markdown AST (no unsanitized HTML string injection); GFM tables/lists; sanitize enforces the XSS invariant. Minimal, focused stack.

**Alternatives:** Other markdown parsers with a separate HTML sanitizer — more DIY, easier to miss a step.

### 4. Strict sanitize; no front matter; no highlight

**Choice:** Default rehype-sanitize schema (or GitHub-ish allowlist if default is too loose for tables). Pass YAML front matter through as ordinary markdown text (no strip/parse). No syntax-highlight rehype plugin.

**Rationale:** v1 = safe GFM preview. Front matter / highlight can follow without API changes.

### 5. SSR-safe load pattern

**Choice:** Read blob text and render markdown only after mount (same async pattern as `TextRenderer`). No browser-only APIs at module top level beyond what the MD libs already allow on import.

**Rationale:** Package must stay SSR-import-safe; render client-side.

### 6. Styling via Tailwind utilities, not new `.css`

**Choice:** Prose-like utility classes on the markdown host (headings, lists, tables with `overflow-x-auto`, code blocks). Prefer existing CSS variables for foreground/borders. Do not add `@tailwindcss/typography` unless already present in package Tailwind setup — hand utilities if not.

**Rationale:** Invariant: no hand-written `.css`; theme via vars.

### 7. Links and images

**Choice:** External links open with `rel="noopener noreferrer"` (and `target="_blank"` if the stack supports link components). Relative/remote images use browser `<img>` fetch from URLs in the document; package does not rewrite or proxy. Document remote image fetch behavior in README.

**Rationale:** Matches "no fetch of external subresources unless documented" invariant.

### 8. Demo fixture

**Choice:** Add an approved sample `.md` under `sample-files/` and copy into `apps/demo/public/sample-files`. Demo must load it as a `Blob`/`File` with `type: "text/markdown"` (or URL whose Content-Type is markdown) so detection succeeds.

## Risks / Trade-offs

- **[Hosts serve `.md` as `text/plain`]** → Document clearly; defer content sniffing; consumers can wrap Blob with correct type.
- **[Sanitize strips useful HTML / breaks some GFM]** → Prefer GFM via remark-gfm; tune allowlist only if tables break; no raw HTML goal.
- **[Bundle size from remark ecosystem]** → Acceptable for a format renderer; monitor gzip; avoid highlight plugins for now.
- **[Large MD files on main thread]** → Same as TextRenderer; workers later if needed.
- **[XSS via markdown]** → rehype-sanitize mandatory; add a test that script tags are stripped / do not run.

## Migration Plan

- Additive: new kind + deps; no **BREAKING** public prop changes.
- Consumers typing exhaustive `FileKind` switches must add `"markdown"`.
- Rollback: remove renderer branch and deps; ensure markdown MIME does not silently fall through to text without an explicit decision.

## Open Questions

None blocking. Content sniffing deferred by product decision.
