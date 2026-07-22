# `@file-viewer/react`

React file viewer with one `FileViewer` component and content-driven renderer selection.

## Install

GitHub install with `pnpm`:

```bash
pnpm add "github:<owner>/<repo>#<ref>&path:/packages/file-viewer"
```

GitHub installs build the package during `prepare`, so the repository does not need committed `dist` output. Lifecycle scripts must be enabled in the consumer install.

Peer dependencies:

- `react`
- `react-dom`

Package name:

The package ships built JS/types plus its packaged PDF worker. Do not import from package `src` or copy worker files into app `public`.

## Quickstart

Consumer setup requirements:

- render `FileViewer` in client/browser runtime (e.g. `"use client"` in Next.js)
- give the viewer a **bounded height** in a flex or grid layout (`min-h-0` on flex ancestors)
- configure Tailwind to scan package utilities (see below)

### Tailwind

The package ships Tailwind class names in JS; they are not in your app source. Import the package scan entry from your global CSS.

**Tailwind v4 (recommended):**

```css
/* src/styles.css (or app entry CSS) */
@import "tailwindcss";
@import "@file-viewer/react/styles.css";
```

`@file-viewer/react/styles.css` scans `dist` plus a small inline safelist for utilities composed in string constants (scrollports, PDF text layer, etc.).

**Alternative (manual scan only):**

```css
@import "tailwindcss";

@source "../node_modules/@file-viewer/react/dist";
@source inline("absolute inset-0 overflow-auto overflow-hidden");
```

If scrollbars or PDF layout look wrong, you are likely missing utilities — use `@import "@file-viewer/react/styles.css"` instead.

**Tailwind v3:** add the package bundle to `content`:

```ts
content: [
  "./src/**/*.{ts,tsx}",
  "./node_modules/@file-viewer/react/dist/**/*.{js}",
];
```

### Layout

`FileViewer` uses `h-full` and an internal `relative` content slot; renderers scroll inside `absolute inset-0 overflow-auto` viewports. The parent chain must supply a real height and allow flex children to shrink.

```tsx
"use client";

import { FileViewer, type FileViewerSource } from "@file-viewer/react";

export function Example({ source }: { source: FileViewerSource }) {
  return (
    <div className="flex h-[640px] min-h-0 flex-col">
      <FileViewer className="min-h-0 flex-1" source={source} />
    </div>
  );
}
```

Fixed height (`h-[640px]`) or flex fill (`flex-1 min-h-0` inside a sized parent) both work. Without `min-h-0` on flex ancestors, content may clip without scrolling.

### Basic usage

Same as above — pass exactly one `source` (see [Source](#source)).

## Source

`source` accepts exactly one value:

- `string`
- `Blob`
- `ReadableStream<Uint8Array>`

String sources are classified in this order:

1. data URL
2. blob/object URL
3. HTTP(S) URL
4. base64

URL-like string sources are loaded with `fetch`. Remote URLs need to be reachable from the browser and compatible with normal CORS behavior.

All source types are buffered to a `Blob` before rendering.

**`ReadableStream` notes:** a stream can only be read once. Reuse the same stream instance across remounts (e.g. React Strict Mode) is handled inside the package, but prefer passing a `Blob` or URL when possible. If you build a stream from `fetch().body`, do not pass that body to multiple viewers without teeing or refetching.

## Supported Files

Supported file families:

- images: JPEG, PNG, GIF, WebP, classical TIFF (`image/tiff`, including multi-page scroll view)
- PDF
- spreadsheets: XLSX, XLS, CSV
- Word documents: DOCX, DOTX
- presentations: PPTX, POTX (static slide preview via pinned Pagus `@pagus-kit/core@0.1.1`, `@pagus-kit/renderer@0.1.1`)
- markdown when MIME is `text/markdown` or `text/x-markdown` (GFM preview; sanitized). Servers that send `.md` as `text/plain` stay on the text path unless the blob/header MIME is corrected.
- HTML when MIME is `text/html`: detected as `html`, but iframe preview is **opt-in** via `enableHtmlPreview` (default `false` → text fallback). When enabled, content runs in a sandboxed iframe with `allow-scripts` and **without** `allow-same-origin`. Enable only for content you trust — author scripts execute and may fetch remote images/CSS/fonts. `application/xhtml+xml` is not HTML in v1.
- text when MIME indicates text, including `text/plain`, other `text/*` values except `text/csv`, markdown MIME, and `text/html` above, `application/json`, `application/xml`, and `application/javascript`

Current limits:

- renderer selection is content-driven, not extension-driven
- unlabeled text/CSV/markdown/HTML blobs are unsupported unless loaded MIME/header data identifies them
- markdown remote images may be fetched by the browser from URLs in the document; the package does not proxy them
- HTML preview (when `enableHtmlPreview`) may fetch remote subresources from the document; the package does not rewrite or block them
- progressive rendering is not supported in v1

## Detection Contract

Renderer selection uses:

1. magic bytes
2. loaded `Blob.type` or HTTP `Content-Type`

It does not use:

- filename extensions
- consumer-provided MIME props
- text/CSV content heuristics

Examples:

```tsx
<FileViewer source={new Blob(["hello"], { type: "text/plain" })} />
// text

<FileViewer source={new Blob(["# Hi"], { type: "text/markdown" })} />
// markdown

<FileViewer source={new Blob(["a,b\n1,2\n"], { type: "text/csv" })} />
// spreadsheet

<FileViewer source={new Blob(["hello"])} />
// unsupported

<FileViewer source={new Blob(["a,b\n1,2\n"])} />
// unsupported
```

## Chrome

Built-in chrome:

```tsx
<FileViewer source={source} />
```

Content-only:

```tsx
<FileViewer source={source} chrome="none" />
```

Custom chrome:

```tsx
import {
  FileViewer,
  type FileViewerChromeApi,
} from "@file-viewer/react";

function MyChrome({ api }: { api: FileViewerChromeApi }) {
  if (api.file.kind === "pdf") {
    return (
      <div>
        <button onClick={api.pdf.prevPage} disabled={!api.pdf.canPrev}>Prev</button>
        <span>{api.pdf.page} / {api.pdf.pageCount}</span>
        <button onClick={api.pdf.nextPage} disabled={!api.pdf.canNext}>Next</button>
      </div>
    );
  }

  if (api.file.kind === "image") {
    return (
      <div>
        <button type="button" onClick={api.image.zoomOut}>-</button>
        <span>{api.image.zoom}%</span>
        <button type="button" onClick={api.image.zoomIn}>+</button>
      </div>
    );
  }

  if (api.file.kind === "spreadsheet") {
    if (api.file.mimeType === "text/csv") {
      return <div>CSV has no workbook controls.</div>;
    }

    return (
      <div>
        {api.spreadsheet.sheetNames?.map((sheetName, index) => (
          <button
            key={sheetName}
            onClick={() => api.spreadsheet.setActiveSheetIndex?.(index)}
          >
            {sheetName}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

<FileViewer source={source} chrome={MyChrome} />
```

Notes:

- `FileViewerChromeApi` is discriminated by `api.file.kind`
- CSV uses `api.file.kind === "spreadsheet"` but has no workbook-level controls
- custom spreadsheet chrome should branch on `api.file.mimeType`
- built-in chrome is hidden for unsupported files, but custom chrome can still receive `api.file.kind === "unsupported"`
- images expose `api.image.zoom`, toolbar `zoomIn` / `zoomOut` (±10%, clamped 40–200%), `setZoom`, `stepZoomIn` (sequential click steps), and `resetZoom` (100%)
- multi-page TIFF also exposes `api.image.page`, `pageCount`, `prevPage`, `nextPage`, `setPage`, and `subscribePageNavigate` (scroll-synced, same model as PDF)
- PDF / PPTX / multi-page TIFF: `setPage` smooth-scrolls using page geometry; `subscribePageNavigate(listener)` fires `{ page, reason: "programmatic" }` when that navigation settles (not on user scroll). Unsubscribe with the returned function.
- `pageCount` starts at `0` until the document reports pages. Early `setPage(N)` is queued and applied when the count is known (not clamped to page 1).
- Every `setPage` re-triggers navigation even if the page is unchanged (same-citation re-jump).
- `geometryReady` on `pdf` / `pptx` / `image` is `true` when scroll geometry for programmatic jumps is available.
- Pass a **stable** custom `chrome` component type (module-level or `useCallback`-stable). Recreating the component type each render remounts the toolbar.
- TIFF pages are decoded lazily near the viewport; download uses the original TIFF bytes
- with `chrome="none"`, single-click step zoom and double-click reset still work on the native image viewport (not on TIFF scroll pages)

## Fallbacks And Errors

```tsx
<FileViewer
  source={source}
  renderFallback={(reason) => <div>Fallback: {reason}</div>}
  onError={(error, context) => {
    console.error(context.stage, context.sourceType, error);
  }}
/>
```

Fallback reasons:

- `unsupported`
- `error`

`onError` stages:

- `load`
- `detect`
- `render`

## Theming

The package exposes CSS variable hooks for consumer theming:

- `--file-viewer-surface`
- `--file-viewer-surface-muted`
- `--file-viewer-border`
- `--file-viewer-border-strong`
- `--file-viewer-foreground`
- `--file-viewer-foreground-strong`
- `--file-viewer-muted`
- `--file-viewer-danger`
- `--file-viewer-shadow`

Example:

```css
.my-file-viewer {
  --file-viewer-surface: #0f172a;
  --file-viewer-surface-muted: #111827;
  --file-viewer-border: #334155;
  --file-viewer-foreground: #e2e8f0;
  --file-viewer-muted: #94a3b8;
}
```

Then pass a wrapper class or `className` as usual.

## TypeScript exports

Import types from `@file-viewer/react` (type-only imports recommended). Renderer **components** are not exported; only `FileViewer` is the public runtime API.

**Core:** `FileViewerSource`, `FileViewerProps`, `FileViewerChrome`, `FileViewerChromeApi`, `FileViewerErrorContext`

**Detection:** `FileKind`, `DetectionResult`

**Chrome (per format):** `ImageChromeApi`, `PDFChromeApi`, `SpreadsheetChromeApi`, `DocxChromeApi`, `TextChromeApi`, `MarkdownChromeApi`, `UnsupportedChromeApi`, `PptxChromeApi`

**Page navigation:** `PageNavigateEvent`, `PageNavigateListener`

**Source classification:** `StringSourceKind`

**Renderer props (types only):** `PdfRendererProps`, `ImageRendererProps`, `SpreadsheetRendererProps`, `DocxRendererProps`, `TextRendererProps`, `PptxRendererProps`, `MarkdownRendererProps`

**PDF search:** `PdfSearchMatch`, `PdfSearchState`

## Runtime Notes

- import is SSR-safe, but rendering is client/browser behavior
- browser APIs such as `fetch`, `ReadableStream`, `Blob`, and object URLs are part of the runtime contract
- the package targets modern evergreen browsers
