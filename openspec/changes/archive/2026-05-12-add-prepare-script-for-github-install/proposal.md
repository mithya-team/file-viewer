## Why

`@file-viewer/react` now builds a valid `dist` artifact, but GitHub installs still depend on that artifact already existing in the repo. We need the package to build itself during git-based installs so another repository can install and import it without checked-in `dist`.

## What Changes

- Add a package-level install hook for `packages/file-viewer` so git/GitHub installs build `dist` before the consumer resolves package entrypoints.
- Keep the existing `build` script as the single source of truth and invoke it from the install hook instead of duplicating build logic.
- Align package guidance/validation with the new git-install behavior so GitHub installability no longer depends on committed build output.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `package-distribution`: require the package to self-build for git-based install flows when `dist` is not committed.

## Impact

- `packages/file-viewer/package.json` lifecycle scripts
- package install behavior for GitHub/path-based consumers
- package distribution spec and any related install guidance/validation
