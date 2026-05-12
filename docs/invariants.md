# Invariants

This file details what not to do when building this library/package.

## Public API

- Must expose one primary component: `FileViewer`.
- Must accept one `source` prop as the public data input.
- Must not add parallel source props like `url`, `blob`, `base64`, `streamUrl`, or `mimeTypeForRenderer`.
- Must not require consumers to choose a renderer.
- Must not export individual renderers as public API in v1.
- Must not add custom renderer registration in v1.

## Source Loading

- Must support `string`, `Blob`, and `ReadableStream<Uint8Array>` sources.
- Must classify string sources internally as data URL, blob/object URL, HTTP(S) URL, then base64.
- Must buffer URLs and streams to `Blob` before rendering.
- Must abort stale loads when `source` changes or the component unmounts.
- Must revoke object URLs created by the package.
- Must not revoke object URLs created by the consumer unless the package explicitly created them.
- Must not implement progressive rendering in v1.

## MIME And Renderer Selection

- Must select renderers from loaded data, not consumer intent.
- Must prefer magic-byte sniffing over headers.
- Must use loaded `Blob.type` or HTTP `Content-Type` only after sniffing.
- Must use text and CSV heuristics only after binary signatures and content type checks.
- Must not use filename extensions to select renderers.
- Must not use consumer-provided MIME props to select renderers.
- Must not silently treat unknown binary data as text.
- Must route unsupported or unknown files to the unsupported state.

## Format Scope

- Must support images, `xlsx`, `xls`, `csv`, `pdf`, `docx`, `dotx`, and text files in v1.
- Must render `dotx` through the DOCX path only.
- Must not execute template behavior, embedded actions, macros, scripts, or external document side effects.
- Must not implement PPTX in v1.
- Must document PPTX as future work only.

## Renderer Boundaries

- Must keep renderers internal.
- Must keep renderer inputs normalized.
- Must route loading, ready, error, page, zoom, and search state through the package shell.
- Must not let each renderer invent separate public state APIs.
- Must not throw renderer failures by default.
- Must call `onError` and show fallback UI for detection/render failures.
- Must support `renderFallback` for unsupported/error states.

## Workers And Bundling

- Must use package-owned bundler-managed module workers where workers are needed.
- Must reference workers with package-relative module URLs.
- Must not require consumers to copy worker files into `public`.
- Must not hardcode worker paths like `/pdf.worker.js`, `/csvWorker.js`, or `/excelWorker.js`.
- Must not bundle React or ReactDOM.

## Mithya UI Registry

- Must treat `@mithya/ui-registry` as dev-time registry tooling.
- Never copy code from @mithya/ui-registry. Always use the mithya-ui add/update commands to add and update components.
- Must ship those primitives as part of this package.
- Must not import runtime React components from `@mithya/ui-registry`.
- Must not assume `@mithya/ui-repository` provides runtime components.
- Must not make `@mithya/ui-repository` a component peer dependency unless a real runtime component package exists.

## Styling And Theming

- Must use Tailwind classes.
- Must ship default CSS generated from variables2json `variables.json`.
- Must keep theme values behind CSS variables.
- Must allow host apps to override variables with their own generated CSS.
- Must document required host Tailwind scanning.
- Must not hardcode design-system colors, spacing, radii, or shadows when a token exists.
- Must not depend on a host app's private global CSS for core layout.
- Must not write .css files

## Demo App

- Must place the demo app under `apps/demo`.
- Must serve demo files from `apps/demo/public/sample-files`.
- Must copy existing `sample-files`; do not move or delete originals.
- Must not generate missing format fixtures unless explicitly approved.
- Must demonstrate URL, Blob, base64, stream, and error/unsupported flows.

## Reference Files

- Must leave `sample-renderers` untouched.
- Must not import from `sample-renderers`.
- Must not copy sample renderer files wholesale into package source.
- Must treat `sample-renderers` as reference only.

## Runtime

- Must target modern evergreen browsers.
- Must be safe to import during SSR.
- Must render the viewer on the client.
- Must not add legacy-browser polyfills unless explicitly approved.
- Must not access `window`, `document`, `URL.createObjectURL`, workers, or browser-only APIs at module top level when it would break SSR-safe import.

## Dependency Hygiene

- Must check the package manager before adding dependencies.
- Must keep runtime dependencies minimal and renderer-specific.
- Must keep `react` and `react-dom` as peers.
- Must not add dependencies only used by the demo to the library package.
- Must not vendor large parsing libraries when a smaller established package is already selected.

## Error And Security Footguns

- Must treat remote fetch failures as user-visible errors.
- Must not leak fetched file contents to logs.
- Must not execute scripts from loaded documents.
- Must not inject loaded text or document HTML with unsafe `innerHTML` unless sanitized or produced by a trusted renderer library with understood limits.
- Must not fetch external document subresources unless the renderer library requires it and the behavior is documented.