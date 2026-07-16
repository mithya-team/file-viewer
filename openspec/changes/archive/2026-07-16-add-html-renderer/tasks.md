## 1. Types and public exports

- [x] 1.1 Extend `FileKind` / `DetectionResult` with `"html"`; add `HtmlChromeApi`; add `enableHtmlPreview?: boolean` to `FileViewerProps`
- [x] 1.2 Export `HtmlChromeApi` and `HtmlRendererProps` from `src/index.ts`; update `verify-dist` if it enumerates public types

## 2. Detection

- [x] 2.1 Add `text/html` branch before generic `text/*` in `detectFileKind` (with `isProbablyText` guard); exclude xhtml
- [x] 2.2 Add detection tests: `text/html` → html; binary + html MIME → not html; xhtml → not html; unlabeled `<html>` → not html

## 3. HtmlRenderer

- [x] 3.1 Implement `HtmlRenderer` (blob URL iframe, `sandbox="allow-scripts"`, revoke on cleanup; viewport class)
- [x] 3.2 Add smoke tests: iframe present with sandbox allowing scripts and without same-origin; URL revoke on unmount

## 4. FileViewer shell and chrome

- [x] 4.1 Wire `enableHtmlPreview` (default false): html + true → `HtmlRenderer`; html + false → `TextRenderer`
- [x] 4.2 Build `HtmlChromeApi` in chrome API switch (file + downloadUrl only); default chrome handles html
- [x] 4.3 Add FileViewer tests for default text fallback vs opt-in iframe

## 5. Demo and docs

- [x] 5.1 Add approved sample `.html` to `sample-files/` and `apps/demo/public/sample-files`; demo loads with `text/html` MIME and shows opt-in path
- [x] 5.2 Update `docs/invariants.md`, `docs/architecture.md`, `AGENTS.md`, package `README.md` (opt-in scripts, remote subresources, no xhtml)
- [x] 5.3 Note CSP / network opt-out / xhtml as deferred in `future_work.md` if useful
