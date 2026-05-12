## Why

`packages/file-viewer/README.md` is close, but it still leaves consumer footguns unclear. A consumer should be able to install `@file-viewer/react`, render a file, satisfy host setup, and understand known limits without reading source or tests.

## What Changes

- tighten `packages/file-viewer/README.md` around first-run consumer setup, not repo-local context
- document the practical install-and-use path end to end: install, import, sized container, and Tailwind scanning
- document supported formats, runtime/platform assumptions, fallback/error behavior, and key source caveats such as URL fetch/CORS behavior
- document the theming/customization surface consumers can rely on without implying unsupported API

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `package-distribution`: expand consumer guidance requirements so the package README covers the full consumer setup and usage contract, not only install metadata

## Impact

- `packages/file-viewer/README.md`
- package distribution documentation contract in OpenSpec
- no public API, renderer behavior, or dependency changes
