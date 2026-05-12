## Context

`packages/file-viewer` already emits `dist`, but the package is still marked `private`, the demo resolves `@file-viewer/react` to `src/index.ts`, and Tailwind scans package source directly. The current package build is also `tsc`-only, which leaves runtime asset handling outside the build pipeline. That keeps local iteration fast, but it does not validate the built artifact shape, export map, or consumer-facing style/runtime behavior that GitHub installs depend on.

This change crosses package metadata, build output, docs, and demo wiring, so it needs an explicit design before implementation.

## Goals / Non-Goals

**Goals:**
- make `@file-viewer/react` usable as a built install target from GitHub
- define the consumer-facing artifact shape: JS, types, exports, and required runtime assets
- make `apps/demo` validate the built package contract instead of only source-linked behavior
- keep fast local iteration available where useful, without weakening built-artifact validation

**Non-Goals:**
- publishing to npm
- adding new file format support
- changing the public viewer API beyond what package distribution requires
- introducing a separate CSS/tokens artifact unless required to make built usage work

## Decisions

### 1. Treat package distribution as an explicit contract

The implementation should define exactly what the built package must contain: executable entrypoints, type declarations, export map coverage, and any runtime-owned worker/assets required by renderers.

Why this over "just build dist":
- a plain `tsc` output is not enough if consumers cannot resolve runtime assets or if package metadata stays workspace-oriented
- the demo now needs a concrete target to validate

Alternative considered:
- keep distribution implicit and rely on ad hoc manual testing. Rejected because it misses packaging regressions.

### 2. Use a bundler-managed library build for runtime output

Package JavaScript and runtime assets should be built with Vite library mode (or equivalent Rollup/Rolldown-backed bundling), while TypeScript declarations should be emitted separately with `tsc --emitDeclarationOnly`.

Why this over raw `tsc` plus post-build patching:
- the package needs bundler-aware handling for emitted runtime assets such as the PDF worker
- a library bundler can rewrite asset URLs and emit worker files directly into `dist`
- declarations still fit cleanly in a separate TypeScript-only pass

Alternative considered:
- keep `tsc` as the JS build and patch `dist` afterward with `prepare-dist.mjs`. Rejected because the post-build rewrite is compensating for a build pipeline that does not model runtime assets.

### 3. Validate demo behavior against the built package artifact

`apps/demo` should stop depending only on a source alias and should validate the installed/built package shape that external consumers use. Built-artifact validation should use a repo-local `file:` dependency that points at the built package, because that is close to consumer installation while staying simple inside the monorepo. The demo can still preserve a fast dev loop, but built-artifact validation must be part of the normal package workflow.

Why this over source-only linking:
- source linking bypasses export-map, dist-layout, and packaged-asset failures
- Tailwind scanning against `src` hides whether installed-package scanning guidance is correct

Alternative considered:
- keep `apps/demo` source-linked and add a separate smoke app later. Rejected as the default because the docs now require `apps/demo` itself to validate package behavior.
- use a packed tarball or other GitHub-install proxy. Rejected for this change because a repo-local `file:` dependency is simpler to automate while still validating built artifact shape.

### 4. Keep Tailwind validation consumer-shaped

Once the demo targets the built package, its Tailwind configuration should point at the installed package location or built artifact path that mirrors consumer setup, not package source.

Why:
- this catches class-discovery mistakes in docs and package layout
- it validates the current decision to rely on host-side Tailwind scanning instead of shipping precompiled utility CSS

Alternative considered:
- continue scanning `packages/file-viewer/src`. Rejected because it only proves monorepo internals.

### 5. Document GitHub-install expectations alongside implementation

`packages/file-viewer/README.md` should describe the install path, peer/runtime expectations, and host Tailwind setup that match the new artifact shape.

Why:
- installability is incomplete if consumers cannot reproduce the demo wiring

### 6. Handle the PDF worker through bundler-managed asset emission

There is no package-owned CSS artifact today, so no extra CSS file needs inclusion beyond JS/types. The PDF renderer does require explicit runtime handling beyond current JS/type output, but that handling should live in the bundler configuration and source import pattern instead of a post-build patch step. The renderer should use a bundler-aware worker URL import, and the library build should emit the worker as part of `dist`.

Why:
- current demo builds already show bundler-managed worker emission works
- the same mechanism should be used in the package build instead of copying and rewriting files after `tsc`

Alternative considered:
- keep a `prepare-dist.mjs` step that copies the worker and rewrites emitted JS. Rejected because it is brittle and duplicates what the bundler should own.

## Risks / Trade-offs

- Built-artifact validation can slow the demo loop -> Mitigation: keep fast local dev available, but require built-package checks in validation workflow
- Bundler-based package builds add build tooling complexity -> Mitigation: keep JS bundling narrow, keep types in a separate TypeScript pass, and retain artifact verification
- Worker/runtime assets may need packaging changes -> Mitigation: make asset expectations explicit in the distribution contract and test them through demo flows
- GitHub install semantics can differ from workspace installs -> Mitigation: validate using the same built artifact shape the package exposes to external consumers

## Migration Plan

1. finalize built package contract in `packages/file-viewer`
2. move runtime JS/assets to a Vite library build and declarations to a TypeScript-only declarations pass
3. switch demo dependency/wiring to built artifact validation
4. update README install and Tailwind guidance to match
5. verify demo exercises supported source modes and worker-backed paths against built output

