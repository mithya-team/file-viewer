## Why

DOCX files with anchored images (header logos, full-page backgrounds, behind-text graphics) render incorrectly in `FileViewer`: images decode and have valid `src`, but `docx-preview` emits **0×0 wrappers** for `wrapNone` anchors, ignores horizontal `align="right"`, and page sections use **`overflow: hidden`**, which clips the artwork. Users see a plain page with only text (e.g. title) while Slack/Word show the intended branded layout.

## What Changes

- Add a **post-render layout correction** pass after `docx-preview` finishes, scoped to the DOCX host container.
- Fix **zero-size drawing wrappers** so anchored images use their intrinsic / declared dimensions and are visible.
- Fix **horizontal alignment** for anchors aligned to the right (and other common align cases used in templates).
- Improve **stacking** for behind-document images so backgrounds and header art appear under body text, not clipped or buried.
- Add **automated regression coverage** using `dataops_sample_template_v1.docx` (or equivalent fixture).
- Document known remaining gaps vs Word (complex wrap modes, all anchor relative targets).

## Capabilities

### New Capabilities

- `docx-renderer-layout`: Correct anchored/floating image layout and visibility for DOCX/DOTX rendered via `docx-preview`, including header logos and full-page background graphics.

### Modified Capabilities

- _(none — no existing DOCX capability spec in `openspec/specs/`)_

## Impact

- `packages/file-viewer/src/renderers/DocxRenderer.tsx` — invoke correction after `renderAsync`.
- New helper module under `packages/file-viewer/src/renderers/docx/` (layout correction logic).
- Tests in `packages/file-viewer/test/`.
- Demo fixture `dataops_sample_template_v1.docx` as visual/regression reference; no public API changes to `FileViewer` props.
