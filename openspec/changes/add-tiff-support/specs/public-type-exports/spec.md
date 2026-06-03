## MODIFIED Requirements

### Requirement: ImageChromeApi documents zoom controls

`ImageChromeApi` SHALL include an `image` object when `file.kind` is `"image"`, with the following members for TypeScript consumers:

- `zoom: number` — current zoom percentage
- `zoomIn: () => void` — toolbar step (+10, clamped 40–200)
- `zoomOut: () => void` — toolbar step (−10, clamped 40–200)
- `setZoom: (zoom: number) => void` — set clamped zoom
- `stepZoomIn: () => void` — sequential single-click step (+50 / +25 / +10 rules)
- `resetZoom: () => void` — reset to 100
- `page: number` — current 1-based page (meaningful for multi-page TIFF; `1` for other images)
- `pageCount: number` — total pages (`1` for non-TIFF images; IFD count for TIFF)
- `canPrev: boolean` — whether `prevPage` is allowed
- `canNext: boolean` — whether `nextPage` is allowed
- `prevPage: () => void` — go to previous page and scroll
- `nextPage: () => void` — go to next page and scroll
- `setPage: (page: number) => void` — set clamped page and scroll

#### Scenario: Consumer narrows image chrome API for zoom

- **WHEN** a consumer writes `function Chrome({ api }: { api: FileViewerChromeApi }) { if (api.file.kind !== "image") return null; api.image.zoomIn(); }`
- **THEN** TypeScript SHALL resolve `api.image.zoomIn` without error

#### Scenario: Consumer uses TIFF page navigation types

- **WHEN** a consumer writes `if (api.file.kind === "image" && api.image.pageCount > 1) api.image.setPage(2);`
- **THEN** TypeScript SHALL resolve `api.image.setPage` and `api.image.pageCount` without error
