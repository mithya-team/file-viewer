## Context

`text/html` currently matches the generic `text/*` detector and renders via `TextRenderer`. Invariants forbid executing scripts from loaded documents and forbid unsafe `innerHTML`. Consumers still want HTML preview for mostly-trusted files (exported reports, internal docs). Safe-by-default means the iframe path is opt-in.

## Goals / Non-Goals

**Goals:**

- Detect `text/html` as `FileKind: "html"` (MIME-only, after sniff miss, `isProbablyText` guard).
- Default: show HTML as text fallback (no iframe, no script execution).
- Opt-in `enableHtmlPreview`: sandboxed iframe with `allow-scripts`, never `allow-same-origin`.
- Allow remote subresources; document privacy/network side effects.
- Chrome/download parity with other text-like formats.

**Non-Goals:**

- `application/xhtml+xml` or other HTML-ish MIME.
- CSP wrapping / stripping remote URLs.
- Extra sandbox tokens (`allow-same-origin`, `allow-top-navigation`, popups, forms) in v1.
- Extension or content-heuristic routing.
- Progressive HTML streaming.

## Decisions

### 1. Opt-in prop, not opt-out

**Choice:** `enableHtmlPreview?: boolean` on `FileViewerProps`, default `false`.

**Rationale:** Matches “safe by default.” Hosts that trust content explicitly accept script + network risk. Docs call out the trust boundary on the prop.

**Alternatives:** Default-on + disable prop — better for trusted-only products, worse for a general library.

### 2. Detect as `html` even when preview disabled

**Choice:** Detection always yields `kind: "html"` for `text/html`. FileViewer routes to `TextRenderer` when `enableHtmlPreview` is false, `HtmlRenderer` when true.

**Rationale:** Chrome/download/kind stay honest; gating is a render-policy choice, not a MIME lie. Avoids re-detecting when the prop flips.

**Alternatives:** Detect as `text` until opted in — simpler routing, but chrome reports wrong kind and confuses consumers inspecting `DetectionResult`.

### 3. Sandbox: `allow-scripts` only

**Choice:** `<iframe sandbox="allow-scripts" src={blobUrl} />`. No `allow-same-origin`.

**Rationale:** Scripts needed for preview fidelity; combining with `allow-same-origin` is a known sandbox escape. Opaque/null origin keeps parent page isolated.

**Alternatives:** Empty sandbox (no scripts) — conflicts with product need. Full permissions — unsafe.

### 4. `blob:` URL, not `srcdoc`

**Choice:** `URL.createObjectURL(blob)` for iframe `src`; revoke on cleanup (same pattern as package download URLs / other renderers).

**Rationale:** Preserves original bytes/encoding; no size ceiling of stuffing into attribute; fits buffered Blob model.

**Alternatives:** `srcdoc` — easier CSP injection later, worse for large docs and encoding edge cases.

### 5. Remote subresources allowed

**Choice:** Do not rewrite HTML or inject CSP. Document that images/CSS/fonts/XHR from the document may hit the network.

**Rationale:** Mostly-trusted threat model; blocking would break real previews. Future work can add CSP/opt-out.

### 6. Text fallback reuses `TextRenderer`

**Choice:** When disabled, pass the same blob to existing `TextRenderer`.

**Rationale:** No new “source view” UI; current `text/html` UX preserved as the safe path.

## Risks / Trade-offs

- **[Opt-in still runs untrusted JS in iframe]** → Docs + prop name; never ship `allow-same-origin` with scripts; warn in README.
- **[Tracking via remote imgs/CSS]** → Document; future CSP opt.
- **[Wrong MIME → text path]** → Same as markdown; no extension sniff in v1.
- **[kind html + TextRenderer confusing in tests]** → Assert prop gating explicitly in FileViewer tests.
- **[Invariant softens “never execute scripts”]** → Update invariants to “not by default; only when `enableHtmlPreview`.”

## Migration Plan

- Non-breaking: default behavior for `text/html` remains text-like (now via html kind + TextRenderer).
- Consumers wanting preview set `enableHtmlPreview`.
- Rollback: remove prop + renderer; restore `text/html` under `text/*` if needed.

## Open Questions

None — explore locked: opt-in, text fallback, scripts, allow+document network, no xhtml.
