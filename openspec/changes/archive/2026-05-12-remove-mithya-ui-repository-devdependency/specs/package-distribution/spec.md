## MODIFIED Requirements

### Requirement: Built package exposes an installable consumer artifact

`@file-viewer/react` SHALL build into a consumer-installable artifact that can be used outside the workspace, including GitHub-based installation flows, without requiring consumers to import package source files directly or resolve unused git-sourced Mithya dev dependencies.

#### Scenario: Consumer resolves package entrypoint

- **WHEN** a consumer installs `@file-viewer/react` from the built package artifact
- **THEN** importing `@file-viewer/react` SHALL resolve through package metadata to built JavaScript and type declaration entrypoints

#### Scenario: Build emits runtime JS and declarations through intended pipelines

- **WHEN** the package build runs
- **THEN** runtime JavaScript and runtime-owned assets SHALL be emitted by the package bundling pipeline, and TypeScript declarations SHALL be emitted for the same public entrypoints

#### Scenario: Package does not depend on workspace-only source paths

- **WHEN** the package is consumed outside this monorepo
- **THEN** runtime behavior SHALL not require direct references to `packages/file-viewer/src` or other workspace-only paths

#### Scenario: Git-based install avoids unused Mithya tooling dependency

- **WHEN** a consumer installs `@file-viewer/react` from a git-based source
- **THEN** the package install path SHALL not require fetching `@mithya/ui-registry` or `mithya-team/ui-repository` unless the package build actually uses that tooling

### Requirement: Consumer guidance matches the built package contract

The package documentation SHALL describe the supported install path, peer/runtime dependency expectations, absence of unused Mithya install prerequisites, and host setup needed to use the built package artifact.

#### Scenario: Consumer follows install guidance

- **WHEN** a consumer follows the package README for install and host setup
- **THEN** the consumer SHALL have enough information to import `FileViewer`, satisfy peer dependencies, and configure Tailwind scanning for the installed package

#### Scenario: Git-based install guidance does not mention Mithya setup

- **WHEN** a consumer follows the documented GitHub install path
- **THEN** the documentation SHALL not require `@mithya/ui-registry`, `@mithya/ui-repository`, or other Mithya-specific setup unless the package explicitly adopts that tooling again
