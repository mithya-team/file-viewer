## Context

`packages/file-viewer/README.md` already covers install, imports, source types, chrome modes, fallbacks, and Tailwind scanning. The remaining gap is not missing API coverage; it is missing consumer-oriented guidance that helps a new adopter succeed on first render and avoid predictable setup mistakes.

This change is doc-only. The package contract already exists in code and current specs, but parts of that contract are only obvious from source, tests, or demo usage: the viewer needs a sized container, URL sources use `fetch`, the component is browser/client runtime even though import is SSR-safe, and the package exposes a theming surface through CSS variables.

## Goals / Non-Goals

**Goals:**
- make the package README sufficient for first-time external consumers
- keep README structure centered on install-to-first-render flow
- document supported formats, setup requirements, caveats, and customization points that consumers can rely on
- align README claims with current public API and current runtime behavior

**Non-Goals:**
- changing package runtime behavior
- changing public API or adding new exports
- adding new install channels beyond the currently supported package contract
- turning the README into full architecture or maintainer documentation

## Decisions

### 1. Reframe README around first consumer success

The README should lead with the shortest path from install to rendered viewer: install, import, sized container, and Tailwind setup. That puts the main adoption path ahead of secondary details like repo-local validation notes.

Alternative considered:
- keep the current mostly reference-style structure. Rejected because it explains pieces, but not the first successful consumer flow.

### 2. Make consumer footguns explicit

The README should explicitly call out behavior that can surprise consumers:
- the viewer needs a sized container or parent height context
- string URL sources are loaded via `fetch`, so remote URLs must be reachable under normal browser fetch/CORS constraints
- import should remain SSR-safe, but actual viewing is client/browser behavior

Alternative considered:
- leave these implicit in examples. Rejected because they are common adoption failures.

### 3. Document limits and supported surface as contract, not lore

The README should list supported formats, major non-goals, fallback/error semantics, and the theming/customization surface consumers can depend on today. This reduces source-diving and keeps the package contract legible.

Alternative considered:
- mention only examples and infer the rest. Rejected because supported/unsupported behavior is part of consumer decision-making.

### 4. Keep the scope doc-only and behavior-faithful

README changes should describe current behavior rather than inventing future-facing API or unsupported promises. The document should stay tied to the actual exported API, current supported formats, and existing styling contract.

Alternative considered:
- broaden scope into runtime or API cleanup. Rejected because the change is about consumer guidance quality, not implementation changes.

## Risks / Trade-offs

- docs can drift from runtime behavior later -> keep README grounded in current exports, tests, and demo usage
- adding too much detail can make the README noisy -> prefer a short quickstart plus compact caveat/reference sections
- documenting current limits can make the package feel narrower -> worth it because hidden limits are worse for consumer trust

## Migration Plan

1. update `packages/file-viewer/README.md` in place
2. keep examples aligned with current exported API only
3. verify the final README against current package behavior and current package-distribution spec

## Open Questions

None.
