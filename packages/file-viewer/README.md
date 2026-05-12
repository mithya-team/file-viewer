# `@file-viewer/react`

React file viewer with one `FileViewer` component and content-driven renderer selection.

## Install

Current repo validation uses workspace linking via `@file-viewer/demo`.

Package name:

```ts
@file-viewer/react
```

Publish/Git install guidance is still pending the repo's publish posture.

## Import

```tsx
import { FileViewer } from "@file-viewer/react";
```

## Basic usage

```tsx
<FileViewer source={source} />
```

`source` accepts exactly one value:

- `string`
- `Blob`
- `ReadableStream<Uint8Array>`

String sources are classified as:

1. data URL
2. blob/object URL
3. HTTP(S) URL
4. base64

## Chrome modes

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

## Fallbacks and errors

```tsx
<FileViewer
  source={source}
  renderFallback={(reason) => <div>Fallback: {reason}</div>}
  onError={(error, context) => {
    console.error(context.stage, error);
  }}
/>
```

## Detection contract

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

<FileViewer source={new Blob(["a,b\n1,2\n"], { type: "text/csv" })} />
// spreadsheet

<FileViewer source={new Blob(["hello"])} />
// unsupported

<FileViewer source={new Blob(["a,b\n1,2\n"])} />
// unsupported
```

## Tailwind

Host apps need to scan the package classes so viewer styles are emitted.

Example:

```ts
content: [
  "./src/**/*.{ts,tsx}",
  "./node_modules/@file-viewer/react/**/*.{js,ts,jsx,tsx}",
];
```
