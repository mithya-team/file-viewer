# Demo Built Package Validation Specification

## Purpose

`apps/demo` SHALL validate the built `@file-viewer/react` artifact the same way an external consumer would consume it.

## Requirements

### Requirement: Demo validates the built package artifact

`apps/demo` SHALL validate the built `@file-viewer/react` package artifact that consumers are expected to install, not only workspace-linked source behavior.

#### Scenario: Demo resolves built package

- **WHEN** `apps/demo` imports `@file-viewer/react`
- **THEN** resolution SHALL target the built/installable package artifact rather than a direct alias to package source

#### Scenario: Demo uses repo-local file dependency

- **WHEN** `apps/demo` validates built-package behavior inside the monorepo
- **THEN** it SHALL consume `@file-viewer/react` through a repo-local `file:` dependency that points at the built package artifact

### Requirement: Demo validates consumer-shaped styling setup

`apps/demo` SHALL use Tailwind scanning that matches the installed package location or built artifact path consumers follow, so style emission is validated against the package contract.

#### Scenario: Demo scans installed package classes

- **WHEN** demo styles are built
- **THEN** Tailwind scanning SHALL target the built package location used by demo consumption rather than `packages/file-viewer/src`

### Requirement: Demo exercises built-package runtime behavior across source modes

`apps/demo` SHALL exercise supported source modes and fallback/error flows while consuming the built package artifact, so packaging regressions are caught in normal validation.

#### Scenario: Supported flows run against built package

- **WHEN** the demo exercises URL, Blob, base64, stream, and unsupported/error flows
- **THEN** those flows SHALL execute against the built package artifact and expose packaging, export, style, or worker regressions before release
