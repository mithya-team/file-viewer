## Why

The compiled stylesheet added in `971741f` imports Tailwind's default theme into `:root, :host` and emits unprefixed utilities. In a Tailwind v4 host, importing the package can therefore change host tokens and selectors such as `.container`, `.text-sm`, and `.p-4`.

## What Changes

- Compile FileViewer's utility CSS from an isolated, package-owned Tailwind theme with no global theme-variable output.
- Prefix and root-scope package utilities and Tailwind implementation properties so they cannot style host markup.
- Replace broad source-file fixture scanning with a bounded, verified utility-candidate input.
- Add an optional scoped Tailwind-token bridge for consumers who deliberately want host typography and spacing values in FileViewer.
- Add a Tailwind v4 host integration test that verifies both import orders preserve host variables and unrelated utility styles.
- Update package import/theming guidance and document why Glide Data Grid remains pinned to its React-19-compatible alpha release.

## Capabilities

### New Capabilities

- `package-style-isolation`: Collision-free package stylesheet generation, scoped consumer theming bridge, and Tailwind v4 host integration coverage.

### Modified Capabilities

- `package-distribution`: The installed stylesheet and consumer setup contract no longer require host Tailwind scanning and must be import-order independent.

## Impact

- `packages/file-viewer` stylesheet generator, CSS exports, internal utility class names, root markup, package verification, tests, and README/help documentation.
- `apps/demo` becomes a Tailwind v4 custom-theme integration fixture or gains a dedicated equivalent fixture.
- No public React API change is required; the documented CSS custom-property surface is expanded under the `--file-viewer-*` namespace.
