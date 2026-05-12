## Decisions

### 1. Public API Uses One `source` Prop

Decision: `FileViewer` accepts a single `source` prop with `string | Blob | ReadableStream<Uint8Array>`.

Rationale: The consumer should provide data, not rendering instructions. A single prop keeps the API small and avoids mutually exclusive URL/blob/base64 props.

Consequence: String sources need internal classification. Invalid strings fail through the unsupported/error path.

### 2. Strings Are Auto-Classified

Decision: String sources are classified as data URL, blob/object URL, HTTP(S) URL, then base64.

Rationale: This supports the requested simple API without requiring wrapper objects.

Consequence: Ambiguous strings are handled best-effort. Rendering still depends on loaded data and MIME detection.

### 3. Renderer Selection Is Content-Driven

Decision: Renderer selection uses loaded data: magic bytes first, loaded `Blob.type` or HTTP `Content-Type` second.

Rationale: Consumers should not be able to force the wrong renderer with props or filenames, and unsupported data should fail closed instead of being guessed into text or CSV.

Consequence: Filename extensions and consumer-provided MIME values are metadata only, not routing inputs. Text/CSV heuristics are not routing inputs either.

### 4. All Sources Buffer Before Rendering

Decision: URLs and streams are buffered to `Blob` before rendering.

Rationale: PDF, DOCX, and spreadsheet libraries generally need complete buffers or random access.

Consequence: True progressive rendering is out of scope for v1.

### 5. PPTX Is Future Work

Decision: PPTX is not implemented in v1.

Rationale: It adds a separate rendering surface beyond the requested v1 formats.

Consequence: The architecture can add a PPTX renderer later without changing the public API.

### 6. DOTX Uses DOCX Rendering

Decision: DOTX files render through the DOCX path.

Rationale: DOTX is an OpenXML Word template container and can be displayed with the same basic document renderer.

Consequence: Template metadata, actions, and macro-like behavior are not executed.

### 7. Renderers Stay Internal

Decision: Export `FileViewer`, types, and CSS only. Do not export individual renderers as public API in v1.

Rationale: MIME-driven routing is a core package invariant.

Consequence: Custom renderer registration is future work.

### 8. Built-In Toolbar Is Optional

Decision: `FileViewer` exposes one `chrome` prop. It supports built-in chrome with `"default"`, content-only mode with `"none"`, and host-owned chrome with a component that receives `FileViewerChromeApi`.

Rationale: The package should be usable out of the box, but it also needs to support content-only embeds and host-owned chrome without exposing internal renderers.

Consequence: Viewer state stays in the package shell and is surfaced through a discriminated `FileViewerChromeApi`. Spreadsheet chrome branches on `file.kind === "spreadsheet"` and then `file.mimeType`, since CSV has no workbook-level controls.

### 9. Errors Use Fallback UI And Callback

Decision: Detection/render failures show built-in fallback UI, allow `renderFallback`, and call `onError`.

Rationale: Consumers need both user-visible recovery and telemetry hooks.

Consequence: Renderer errors should not be thrown to React error boundaries by default.

### 10. Styling Uses Tailwind And Figma Variables

Decision: The package uses Tailwind classes and CSS variable fallbacks. A separate packaged CSS/tokens artifact is deferred until there is a concrete need.

Rationale: This keeps the current package surface smaller while preserving a path to ship shared tokens later if needed.

Consequence: Host apps still own Tailwind scanning. Shared CSS/token packaging stays optional follow-up work, not a current requirement.

### 11. Host Tailwind Scans Library Classes

Decision: Consumers must configure Tailwind to scan library source/classes.

Rationale: This keeps Tailwind output aligned with host builds and avoids relying only on precompiled utility CSS.

Consequence: The package docs must include consumer Tailwind configuration.

### 12. Mithya UI Registry Is Dev-Time

Decision: Use `@mithya/ui-registry` as a dev-time generator/CLI pattern. Generate or copy needed design-system primitives into `packages/file-viewer/src` and ship them with the package.

Rationale: `@mithya/ui-registry` exports registry tooling, parsers, generators, theme CSS, and config. It does not export runtime React components like `Button` or `Table`, so a peer dependency alone cannot provide UI components to `file-viewer`.

Consequence: Do not import runtime UI components from `@mithya/ui-registry` or require `@mithya/ui-repository` as a component peer dependency. Runtime peers stay limited to actual runtime dependencies such as React unless a separate component package is published.

### 13. Workers Are Package-Owned

Decision: PDF/spreadsheet workers are bundled as package-owned module workers.

Rationale: Consumers should not manually copy worker files into public assets.

Consequence: The package targets bundlers that support `new URL(..., import.meta.url)` worker references.

### 14. Demo App Lives In `apps/demo`

Decision: Create a Vite demo app at `apps/demo`.

Rationale: The workspace already includes `apps/*`.

Consequence: Existing sample files are copied to `apps/demo/public/sample-files`, including the current `txt`, `csv`, `jpg`, `pdf`, `docx`, `dotx`, and `xlsx` fixtures. Some tooling views may omit binary fixtures, so the on-disk folder is the source of truth.

### 15. `sample-renderers` Is Reference-Only

Decision: Leave `sample-renderers` untouched and do not import from it.

Rationale: It is useful implementation reference but not package source.

Consequence: Any package renderer must be implemented independently under package source.

### 16. Runtime Target Is Evergreen Browsers

Decision: Support modern evergreen browsers and SSR-safe import only.

Rationale: The package depends on modern file APIs, module workers, and CSS variables.

Consequence: The viewer itself is client-rendered; legacy browser polyfills are out of scope.

### 17. Demo Uses Split-Pane Navigation

Decision: The demo uses a two-pane layout: viewer canvas on the left and a right-side control pane for file-type and source-mode switching.

Rationale: This makes cross-format/source validation fast without changing routes or editing code.

Consequence: Demo UX centers around stateful controls, not per-format pages.

### 18. URL Mode Uses Absolute URLs

Decision: Demo `url` mode passes a full absolute URL to `source`, not a root-relative path.

Rationale: `FileViewer` classifies `string` values and should receive a true URL string for the HTTP(S) branch.

Consequence: Demo source builders resolve fixture paths against `window.location.origin` before passing URL mode values.

### 19. Demo Source Modes Derive From One Fixture Path

Decision: For each selected file type, URL/Blob/Base64/Stream modes are generated from the same fixture path.

Rationale: Keeping source transformations tied to one fixture removes cross-mode drift and isolates source-loading behavior.

Consequence: Mode switching changes transport/representation, not document identity.

### 20. Renderer Delivery Is Human-In-The-Loop

Decision: Renderer work proceeds in a strict loop: implement one renderer, demo it, request explicit feedback, then continue only on `build next renderer`.

Rationale: This keeps review cycles tight and catches issues early before compounding changes.

Consequence: If feedback is not `build next renderer`, the next action is fix/re-demo rather than starting the next renderer.

### 21. Demo Is The Package Validation Harness

Decision: The demo runs as `@file-viewer/demo` under `apps/demo`, uses workspace linking for fast local development, and should also validate the built artifact shape consumers are expected to install.

Rationale: Workspace linking keeps iteration fast while built-artifact validation catches packaging, exports, styling, and worker issues that source-linked development can miss.

Consequence: Workspace wiring (`pnpm-workspace.yaml`, package names, scripts) is part of baseline architecture, not optional setup, but the demo should not be treated as sufficient unless it also covers consumer-facing built package behavior.

### 22. Demo should also use Tailwind

Decision: The demo should use tailwind