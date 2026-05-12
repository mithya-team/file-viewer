## Context

`packages/file-viewer/package.json` exports only built files from `dist`, and the package now has a valid bundler-based build. But GitHub installs still fail if `dist` is absent because the package has no install-time build hook. This gap is specifically about git-based consumption, not the runtime artifact shape itself.

## Goals / Non-Goals

**Goals:**
- make git/GitHub installs build `@file-viewer/react` before consumers resolve `dist` entrypoints
- keep one source of truth for package build logic
- avoid requiring a consumer-global `pnpm` binary during dependency install
- keep the change scoped to package installability, docs, and validation

**Non-Goals:**
- changing the package runtime build pipeline
- committing `dist` into the repository
- changing the public `FileViewer` API
- adding npm publish workflow work

## Decisions

### 1. Use `prepare` as the install-time hook

`packages/file-viewer` should use `prepare`, not `prepack`, because the missing behavior is git-based installability. `prepare` runs for git dependencies and also covers pack/publish flows, while `prepack` does not solve the GitHub install case by itself.

Alternative considered:
- use only `prepack`. Rejected because it does not guarantee git dependency installs build the package.

### 2. Keep one build entrypoint and delegate to it

The package should keep one canonical build command and have `prepare` invoke that command instead of duplicating the build steps. This keeps artifact generation consistent across local validation and git installs.

Alternative considered:
- duplicate `vite build && tsc -p tsconfig.build.json` in both `build` and `prepare`. Rejected because the commands can drift.

### 3. Do not make the lifecycle hook depend on consumer `pnpm`

The install hook should run through a package-local script entrypoint, not by assuming the consuming repository uses `pnpm` or has a global `pnpm` binary available. The contract should stay package-manager-agnostic for git installs.

Alternative considered:
- set `prepare` to `pnpm build`. Rejected because a git dependency install can happen in a non-pnpm consumer environment.

### 4. Keep docs and validation aligned with self-building installs

README/install guidance and package validation should reflect that GitHub installs rely on lifecycle-driven builds rather than checked-in `dist`. This keeps the documented install path consistent with the actual package contract.

Alternative considered:
- change only `package.json`. Rejected because the current docs explicitly discuss GitHub install flows.

## Risks / Trade-offs

- install time increases for git-based consumers -> keep the hook limited to the existing package build only
- lifecycle builds depend on dev tooling being available during install -> keep build tooling declared in the package and validate the flow explicitly
- package-manager-agnostic script delegation can slightly complicate script layout -> prefer a small script alias over duplicated build commands

## Migration Plan

1. add a package-local install hook in `packages/file-viewer/package.json`
2. route both normal build and prepare through one shared build entrypoint
3. update package distribution guidance/spec wording if needed
4. validate that a git-style install path no longer depends on committed `dist`

## Open Questions

None.
