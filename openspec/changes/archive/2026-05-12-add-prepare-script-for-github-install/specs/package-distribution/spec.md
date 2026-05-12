## MODIFIED Requirements

### Requirement: Built package exposes an installable consumer artifact

`@file-viewer/react` SHALL build into a consumer-installable artifact that can be used outside the workspace, including GitHub-based installation flows, without requiring consumers to import package source files directly or rely on committed build output.

#### Scenario: Consumer resolves package entrypoint
- **WHEN** a consumer installs `@file-viewer/react` from the built package artifact
- **THEN** importing `@file-viewer/react` SHALL resolve through package metadata to built JavaScript and type declaration entrypoints

#### Scenario: Build emits runtime JS and declarations through intended pipelines
- **WHEN** the package build runs
- **THEN** runtime JavaScript and runtime-owned assets SHALL be emitted by the package bundling pipeline, and TypeScript declarations SHALL be emitted for the same public entrypoints

#### Scenario: Package does not depend on workspace-only source paths
- **WHEN** the package is consumed outside this monorepo
- **THEN** runtime behavior SHALL not require direct references to `packages/file-viewer/src` or other workspace-only paths

#### Scenario: Git-based install builds missing package artifacts
- **WHEN** a consumer installs `@file-viewer/react` from a git-based source and built files are not committed in the repository
- **THEN** the package lifecycle SHALL build the artifact before consumers resolve package entrypoints
- **AND** the lifecycle path SHALL not require a workspace-only path or a consumer-global `pnpm` binary

### Requirement: Consumer guidance matches the built package contract

The package documentation SHALL describe the supported install path, lifecycle-build expectation for git installs, peer/runtime dependency expectations, and host setup needed to use the built package artifact.

#### Scenario: Consumer follows install guidance
- **WHEN** a consumer follows the package README for install and host setup
- **THEN** the consumer SHALL have enough information to import `FileViewer`, satisfy peer dependencies, and configure Tailwind scanning for the installed package

#### Scenario: Consumer installs from GitHub source
- **WHEN** a consumer follows the documented GitHub install path
- **THEN** the documentation SHALL not imply that committed `dist` output is required in the repository
