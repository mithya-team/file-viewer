## 1. Detection implementation

- [x] 1.1 Add generic-MIME helper and specific-MIME early mapping in `detectFileKind.ts` (after unique binary magic, before OpenXML sniff)
- [x] 1.2 Replace substring `inferOpenXmlKind` with zip local-header entry-name walk (`ppt/` / `word/` / `xl/` prefixes; ambiguous → ppt then word then xl)
- [x] 1.3 Keep existing MIME fallbacks for text/md/html/csv after sniff miss; preserve OLE/PDF/image/TIFF paths

## 2. Tests

- [x] 2.1 Add PPTX + chart-embed regression (generic MIME and presentation MIME → `pptx`, not spreadsheet)
- [x] 2.2 Add/adjust tests for package-root xlsx/docx, PDF magic vs wrong MIME, generic zip MIME → sniff
- [x] 2.3 Update obsolete tests that assume raw `xl/` substring wins over `ppt/`
- [x] 2.4 Run `pnpm test` in `packages/file-viewer` and fix failures

## 3. Docs and invariants

- [x] 3.1 Update `docs/invariants.md` MIME section for specific-MIME-first + package-root OpenXML sniff
- [x] 3.2 Rewrite decision 3 in `docs/decisions.md` (rationale + accepted mislabel trade-off)
- [x] 3.3 Sync `docs/architecture.md`, `AGENTS.md`, and `packages/file-viewer/README.md` detection order
