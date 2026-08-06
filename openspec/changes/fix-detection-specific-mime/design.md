## Context

`detectFileKind` sniffs up to 256KB, then for PK zips runs `inferOpenXmlKind`: latin1 substring checks for `xl/`, then `word/`, then `ppt/`. PPTX with chart embeds stores `.xlsx` under `ppt/embeddings/`; when those members are store-compressed, nested `xl/` paths appear in the outer sample. Sniff returns `spreadsheet` before MIME runs — even when `Blob.type` is `presentationml.presentation`. Product accepts trusting wrong specific MIME; unlabeled/generic MIME still needs a correct sniff.

Constraints: no consumer MIME prop; no extension routing; keep fail-closed for unknown binaries; SSR-safe; sync docs (`invariants`, `decisions`, architecture, AGENTS, README).

## Goals / Non-Goals

**Goals:**

- Specific loaded MIME maps to known kinds before OpenXML path sniff (after unique binary magic).
- Generic MIME does not short-circuit; sniff remains authoritative.
- OpenXML kind from outer zip **entry names** only (`ppt/` / `word/` / `xl/` prefixes).
- Docs/invariants/decisions match the new order.
- Regressions for chart-embed PPTX (MIME + generic).

**Non-Goals:**

- Consumer-provided MIME props.
- Content-Types.xml-only classification (entry names sufficient).
- Changing renderers, Pagus, or public `FileViewer` API.
- Progressive sniff / full zip inflate for detection.
- Fixing mislabeled specific MIME by second-guessing the host.

## Decisions

### 1. Detection order

**Choice:** (1) unique binary magic → (2) specific MIME map → (3) OpenXML package-root sniff / other soft sniff → (4) remaining MIME paths (text/md/html/csv) → unsupported.

**Rationale:** Unique signatures (`%PDF`, image magics, TIFF, OLE) stay fail-closed against absurd MIME. OpenXML PK is weak (many formats share it); specific Office MIME must beat flawed path sniff. Text formats stay MIME-driven after sniff miss.

**Alternatives:** MIME-absolute-first (rejected: PDF-as-image lies too easily). Magic-absolute-first (status quo; rejected: causes embed bug).

### 2. Generic MIME set

**Choice:** `""`, `application/octet-stream`, `application/zip`, `application/x-zip-compressed` (normalize case).

**Rationale:** Common “unknown container” labels from CDNs, downloads, and `new Blob(bytes)`.

**Alternatives:** Broader (`binary/octet-stream`, `application/x-download`) — defer until seen in the wild.

### 3. OpenXML classification via zip local-header names

**Choice:** Walk PK local file headers in the sniff sample; collect entry filenames; if any name starts with `ppt/` → pptx; else `word/` → docx; else `xl/` → spreadsheet. Do not search nested file payloads.

**Rationale:** Embed xlsx is a file *inside* a `ppt/embeddings/…` entry; its internal `xl/` strings are not outer entry names. Prefix order makes package identity unique for normal Office packages.

**Alternatives:** Substring with larger exclude list (fragile). Parse `[Content_Types].xml` only (more work; entry names enough). Prefer `ppt/` over `xl/` on raw substring (still wrong if only embed `xl/` appears before `ppt/` in sample — Ren3 had `ppt/` first but `xl/` check ordered first).

### 4. Ambiguous multi-root zips

**Choice:** If entry names claim more than one of `ppt/` / `word/` / `xl/`, prefer `ppt/` then `word/` then `xl/`.

**Rationale:** Rare; deterministic. Specific MIME already resolved most real conflicts.

### 5. Doc updates as part of the change

**Choice:** Rewrite decision 3 and MIME invariants; sync architecture / AGENTS / README in the same change.

**Rationale:** Detection policy is an invariant; code-only drift is unsafe for agents and consumers.

## Risks / Trade-offs

- **[Wrong specific MIME]** → Host mislabel routes to wrong renderer; accepted; renderer error/fallback still applies.
- **[Truncated sniff misses late central-directory-only names]** → Local headers usually list members early; 256KB sample kept; if needed later, raise sample or parse EOCD (out of scope unless proven).
- **[Incomplete zip local-header parser]** → Stick to stored filename field lengths; skip encrypted/unsupported; fail to null → fall through MIME/unsupported.
- **[Spec drift in pptx-renderer]** → Delta removes “xl/ anywhere → spreadsheet”; mime-detection owns global order.

## Migration Plan

- Library-only behavior change; no API version bump required unless release process demands minor for detection fixes.
- Rollback: revert `detectFileKind` + docs; reintroduce embed misclassify.

## Open Questions

None blocking. Defer extra generic MIME types until observed.
