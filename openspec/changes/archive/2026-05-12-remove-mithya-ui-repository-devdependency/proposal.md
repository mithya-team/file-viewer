## Why

`file-viewer` declares `@mithya/ui-registry` from `mithya-team/ui-repository` as a dev dependency even though the package ships local primitives and does not import runtime components from that source. Keeping an unused git-sourced dependency adds avoidable install fragility, especially for GitHub-based consumption and workspace bootstrap.

## What Changes

- Remove the unused `@mithya/ui-registry` / `@mithya/ui-repository` dev dependency from the workspace and package manifests.
- Update any install/build validation or docs that still assume this dependency is part of the package setup.
- Keep the existing local primitives approach; do not replace it with a new runtime UI dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `package-distribution`: package install and validation flows must not depend on an unused git-sourced Mithya dev dependency.

## Impact

- root `package.json` and lockfile
- `packages/file-viewer/package.json`
- package install/bootstrap behavior for local and GitHub-based consumers
- package distribution guidance and validation, if they still reference Mithya tooling
