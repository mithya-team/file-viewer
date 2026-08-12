## Context

`styles.css` currently compiles `tailwindcss/theme.css` and `utilities.css` against an HTML file containing all package source text. The result declares default Tailwind tokens at `:root, :host`, emits unprefixed selectors, and includes false-positive utilities such as `.container`. Tailwind also emits global `--tw-*` property initializers for some utilities. The library must remain self-contained in Tailwind v3/v4 and non-Tailwind hosts while supporting deliberate host theming.

## Goals / Non-Goals

**Goals:**

- Make the shipped stylesheet collision-free and independent of host import order.
- Keep every FileViewer utility functional without a consumer Tailwind scan or host theme values.
- Provide a narrow, scoped CSS-variable bridge for host Tailwind v4 tokens.
- Prevent broad source fixtures and accidental utility expansion from returning.
- Preserve React 18 and 19 support for the CSV renderer.

**Non-Goals:**

- Change the public `FileViewer` React props or make Tailwind a runtime dependency for consumers.
- Restyle vendor renderers, replace Glide Data Grid, or support arbitrary consumer Tailwind utility configuration in package CSS.
- Rewrite or scope third-party CSS selectors that are already vendor-namespaced and whose portal behavior could be affected by containment.

## Decisions

### 1. Compile an internal inline theme and scope every generated selector

The generator will compile utilities against only the values used by FileViewer through `@theme inline`, with `--file-viewer-*` variables and literal fallbacks. `inline` prevents the theme values from being emitted as global CSS custom properties; generated classes contain package values or references only to the FileViewer namespace.

The build will scope every generated selector to the FileViewer root. This keeps the current internal class strings stable, avoids a large and error-prone migration of arbitrary variants, and supports Tailwind v3 consumers while guaranteeing that generic selectors cannot match host markup.

**Alternative considered:** Tailwind utility prefixing. Rejected for the initial fix because root scoping provides the same host isolation without changing every internal class string or dropping Tailwind v3 compatibility.

### 2. Scope package-generated CSS at the FileViewer root

`FileViewer` will render `data-file-viewer-root`. The build will scope generated utility selectors and FileViewer runtime selectors to that root and descendants. It will rewrite Tailwind implementation properties from `--tw-*` to a FileViewer-private namespace before emitting CSS, then scope the associated initialization selector. This protects both accidental use of an `fv:*` class outside the viewer and Tailwind's otherwise-global universal property initializer.

Vendor CSS emitted by Vite remains separate but is validated as vendor-namespaced. It will not be mechanically scoped because vendor overlays may be rendered outside a local subtree.

**Alternative considered:** prefix selectors only. Rejected because Tailwind's unprefixed implementation custom properties and universal initialization remain global.

### 3. Use an exact candidate manifest, not whole-source scanning

The build will generate its Tailwind candidate input from statically declared FileViewer utility strings (including the controlled dynamic safelist), rather than serialize every `.ts`/`.tsx` file. Build verification will reject unprefixed utility selectors and candidate expansion outside the declared set. `tailwind-source.css` will become a compatibility stylesheet alias/deprecation path rather than a consumer scan entry; no package export will ask consumers to scan package source or generated fixtures.

**Alternative considered:** keep the broad scan and blocklist known false positives. Rejected because it scales poorly and future comments, identifiers, and fixtures can silently add CSS.

### 4. Offer an optional one-way host token bridge

The default stylesheet will use FileViewer-private variables such as `--file-viewer-spacing` and `--file-viewer-font-mono`, each with a package fallback. An optional `tailwind-bridge.css` export will assign these variables only on `[data-file-viewer-root]` from conventional Tailwind v4 variables. Consumers can instead assign the private variables in their own theme selector.

The bridge never writes `:root`, `:host`, or a host Tailwind variable, so it remains safe regardless of import order.

### 5. Retain Glide alpha with an explicit compatibility rationale

`@glideapps/glide-data-grid@6.0.4-alpha24` stays pinned. The stable `6.0.3` peer range ends at React 18, while the alpha supports React 19, which FileViewer declares. Documentation and tests will make the decision intentional rather than incidental.

## Risks / Trade-offs

- [Prefix migration misses a variant/arbitrary utility] → Compile and test the complete candidate set, and assert that all rendered internal class names have output selectors.
- [Tailwind internal output changes] → Verify no `:root`, `:host`, `--tw-*`, or unscoped initialization selectors in each build; pin Tailwind's generator version.
- [Scoped selector transformation changes specificity] → Use zero-specificity root scoping and browser-test default FileViewer controls and rendering.
- [Optional bridge refers to an absent host variable] → Every private variable has a standalone fallback.
- [Glide alpha regression] → Keep CSV dynamic-load and React 18/19 package test coverage; reevaluate only when a stable React-19-compatible release exists.

## Migration Plan

1. Emit isolated prefixed CSS and root markup while preserving the existing `styles.css` path.
2. Convert the old scan export to a compatibility alias and document the new single-import path plus optional bridge.
3. Validate the built artifact in custom-theme Tailwind v4 hosts with both import orders.
4. Release as a patch fix; rollback restores the prior stylesheet generator if a rendering issue is discovered.

## Open Questions

- None. The token bridge is additive, and existing semantic `--file-viewer-*` color tokens remain the preferred customization surface.
