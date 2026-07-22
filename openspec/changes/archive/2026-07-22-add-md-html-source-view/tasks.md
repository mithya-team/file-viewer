## 1. Types and exports

- [x] 1.1 Add `ContentViewMode` and widen `MarkdownChromeApi` / `HtmlChromeApi` in `types.ts`
- [x] 1.2 Export `ContentViewMode` from `index.ts`

## 2. Shell routing and chrome API

- [x] 2.1 Add shell `viewMode` state; reset on source/kind change in `FileViewer.tsx`
- [x] 2.2 Wire `viewMode` / `setViewMode` into `createChromeApi` (markdown always; html only when `enableHtmlPreview`)
- [x] 2.3 Route markdown/html ready content on `viewMode` (source → `TextRenderer`)

## 3. Default chrome

- [x] 3.1 Add Preview | Source controls in `FileViewerDefaultChrome` for markdown and html-with-`api.html`

## 4. Tests and docs

- [x] 4.1 Tests: markdown/html preview↔source routing; html toggle gating; reset; chrome API shape
- [x] 4.2 Update README (and invariants if chrome surface documented) for Preview | Source
