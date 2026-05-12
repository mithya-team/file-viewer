## Context

`@mithya/ui-registry` is declared from `mithya-team/ui-repository` in the workspace and package manifests, but `file-viewer` ships local primitives and does not import runtime Mithya components. That makes install/bootstrap flows depend on an unused git-sourced dependency and conflicts with the repo invariant that `@mithya/ui-repository` is not a runtime component source.

## Goals / Non-Goals

**Goals:**
- remove the unused Mithya dev dependency from the workspace and `@file-viewer/react`
- keep package install/build flows working without resolving `mithya-team/ui-repository`
- preserve the current local-primitives approach
- validate docs and package checks against the dependency-free setup

**Non-Goals:**
- changing `FileViewer` runtime behavior or public API
- reintroducing Mithya generator tooling through a different package
- replacing local primitives with a new shared UI dependency
- broad dependency cleanup outside this unused Mithya entry

## Decisions

### 1. Remove the dependency from both manifests that declare it

The root workspace and `packages/file-viewer` both declare `@mithya/ui-registry`, so both should be cleaned up to avoid lockfile drift and install-time fetches from the git repo.

Alternative considered:
- remove it only from one manifest. Rejected because the remaining declaration still keeps the repo tied to the unused dependency.

### 2. Keep local primitives as the only shipped UI layer

The package already has local primitives under `src/primitives`, and repo guidance says Mithya is dev-time tooling only. The change should preserve that model and avoid introducing any replacement runtime UI package.

Alternative considered:
- swap in another external UI dependency. Rejected because the request is dependency removal, not UI architecture change.

### 3. Align validation and docs with the cleaned dependency graph

Any package validation, install guidance, or repo docs that still imply Mithya is required should be updated so the documented install contract matches the manifests.

Alternative considered:
- change manifests only. Rejected because stale validation/docs can hide regressions or confuse future setup work.

## Risks / Trade-offs

- hidden tooling flow may still expect Mithya to be present -> mitigate with repo search and targeted validation before finalizing
- lockfile/package-manager churn may touch more files than the manifest diff -> mitigate by keeping changes scoped to dependency removal
- future Mithya primitive regeneration becomes less convenient -> mitigate by re-adding tooling only when there is an active generation workflow again

## Migration Plan

1. remove the unused Mithya dependency from root and package manifests
2. update lockfile and any affected docs/validation
3. run targeted install/build/package validation
4. if a hidden workflow breaks, document the concrete need before reintroducing tooling

## Open Questions

None.
