## ADDED Requirements

### Requirement: ImageChromeApi documents zoom controls

`ImageChromeApi` SHALL include an `image` object when `file.kind` is `"image"`, with the following members for TypeScript consumers:

- `zoom: number` — current zoom percentage
- `zoomIn: () => void` — toolbar step (+10, clamped 40–200)
- `zoomOut: () => void` — toolbar step (−10, clamped 40–200)
- `setZoom: (zoom: number) => void` — set clamped zoom
- `stepZoomIn: () => void` — sequential single-click step (+50 / +25 / +10 rules)
- `resetZoom: () => void` — reset to 100

#### Scenario: Consumer narrows image chrome API

- **WHEN** a consumer writes `function Chrome({ api }: { api: FileViewerChromeApi }) { if (api.file.kind !== "image") return null; api.image.zoomIn(); }`
- **THEN** TypeScript SHALL resolve `api.image.zoomIn` without error

### Requirement: ImageRendererProps documents zoom inputs

`ImageRendererProps` (type-only export) SHALL document:

- `zoom: number`
- `onStepZoom: () => void`
- `onResetZoom: () => void`

alongside existing `objectUrl` and `onError` fields.

#### Scenario: Consumer imports ImageRendererProps

- **WHEN** a consumer writes `import type { ImageRendererProps } from "@file-viewer/react"`
- **THEN** TypeScript SHALL require `zoom`, `onStepZoom`, and `onResetZoom` when typing full props
