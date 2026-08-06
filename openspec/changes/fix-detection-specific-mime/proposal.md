## Why

PPTX files with embedded Excel chart workbooks are misclassified as spreadsheets: OpenXML sniff matches substring `xl/` inside embed bytes before `ppt/`, so `SpreadsheetRenderer` fails with "Failed to parse spreadsheet." Specific loaded MIME (e.g. `presentationml.presentation`) is ignored because magic sniff always runs first. Unlabeled/generic-MIME PPTX with the same embeds fail the same way.

## What Changes

- Prefer **specific** loaded `Blob.type` / HTTP `Content-Type` when it maps to a known kind; treat **generic** MIME (`""`, `application/octet-stream`, `application/zip`, `application/x-zip-compressed`) as non-authoritative and sniff.
- Keep **strong unique magic** (PDF, JPEG/PNG/GIF/WebP, classical TIFF, OLE) ahead of MIME so binary signatures still win conflicts.
- Fix OpenXML zip sniff: classify from **outer zip entry names** with package-root prefixes `ppt/`, `word/`, `xl/` — not raw latin1 substring search over the sample.
- Update package invariants, decisions, architecture, AGENTS, and README detection policy to match.
- Add regression coverage for PPTX + chart embeds (specific MIME and generic MIME).

## Capabilities

### New Capabilities

- `mime-detection`: Authoritative rules for detection order (unique magic → specific MIME → OpenXML package-root sniff → remaining MIME / unsupported), generic vs specific MIME, and OpenXML entry-name classification.

### Modified Capabilities

- `pptx-renderer`: Replace “`xl/` anywhere in sniff → spreadsheet regardless” with package-root entry rules; specific presentation MIME must yield `pptx` even when embed bytes contain `xl/`.

## Impact

- Code: `packages/file-viewer/src/detect/detectFileKind.ts`, `packages/file-viewer/test/detectFileKind.test.ts` (+ fixture if needed).
- Docs: `docs/invariants.md`, `docs/decisions.md` (decision 3), `docs/architecture.md`, `AGENTS.md`, `packages/file-viewer/README.md`.
- Public API: unchanged (`source` only; no consumer MIME prop).
- No new runtime dependencies.
