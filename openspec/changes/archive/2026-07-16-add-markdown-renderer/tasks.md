## 1. Dependencies and types

- [x] 1.1 Check workspace package manager; add `react-markdown`, `remark-gfm`, `rehype-sanitize` to `packages/file-viewer` runtime deps
- [x] 1.2 Extend `FileKind` / `DetectionResult` with `"markdown"`; add `MarkdownChromeApi` and wire into `FileViewerChromeApi` union
- [x] 1.3 Export `MarkdownChromeApi` and `MarkdownRendererProps` from `src/index.ts`; update `verify-dist` if it enumerates public types

## 2. Detection

- [x] 2.1 Add markdown MIME set (`text/markdown`, `text/x-markdown`) + branch before generic `text/*` in `detectFileKind`
- [x] 2.2 Add detection tests: markdown MIME → markdown; binary + markdown MIME → unsupported; unlabeled `# hi` → not markdown; `text/plain` → text

## 3. MarkdownRenderer

- [x] 3.1 Implement `MarkdownRenderer` (blob → text → react-markdown + remark-gfm + rehype-sanitize; loading/error via existing patterns)
- [x] 3.2 Style with Tailwind utilities (viewport class, prose-like headings/lists/tables/code; table overflow-x); safe link attrs
- [x] 3.3 Add smoke tests: GFM heading/table render; script/javascript URL neutralized; onError on read failure

## 4. FileViewer shell and chrome

- [x] 4.1 Route `kind === "markdown"` to `MarkdownRenderer` in `FileViewer`
- [x] 4.2 Build `MarkdownChromeApi` in chrome API switch (file + downloadUrl only)
- [x] 4.3 Ensure default chrome handles markdown without requiring page/zoom controls

## 5. Demo and docs

- [x] 5.1 Add approved sample `.md` to `sample-files/` and copy to `apps/demo/public/sample-files`; demo loads with `text/markdown` MIME
- [x] 5.2 Update `docs/invariants.md`, `docs/architecture.md`, `AGENTS.md`, package `README.md` (supported formats, MIME-only note, remote images)
- [x] 5.3 Note content sniffing as deferred follow-up in `future_work.md` if useful
