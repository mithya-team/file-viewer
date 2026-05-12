## Why

`@file-viewer/react` still behaves like a workspace-local package, while the docs now require `apps/demo` to validate the built artifact shape consumers install. We need a clear package distribution path so GitHub installs, exports, styles, and worker-backed behavior are validated before publish decisions.

## What Changes

- Prepare `packages/file-viewer` to build into a consumer-installable artifact suitable for GitHub installation.
- Move the package build to a bundler-managed library artifact for runtime JS/assets, with TypeScript declarations emitted separately.
- Define the package surface needed for built usage, including exports, dependency expectations, and shipped assets needed at runtime.
- Update `apps/demo` to validate the built package artifact instead of relying only on source-level workspace linking.
- Add validation/docs expectations so demo checks catch packaging, style scanning, and worker-path issues before release.

## Capabilities

### New Capabilities
- `package-distribution`: Define the built package contract required for GitHub install and consumer use.
- `demo-built-package-validation`: Define how `apps/demo` validates the built `@file-viewer/react` artifact rather than only workspace source behavior.

### Modified Capabilities

None.

## Impact

- `packages/file-viewer` build/package metadata, bundler config, and dist output
- `apps/demo` dependency and Tailwind/package-consumption wiring
- consumer install/setup docs in `packages/file-viewer/README.md`
- validation flow for exports, styles, and worker-backed runtime behavior
