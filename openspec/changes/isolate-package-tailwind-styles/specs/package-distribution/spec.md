## MODIFIED Requirements

### Requirement: Consumer guidance matches the built package contract
The package documentation SHALL describe the supported install path, lifecycle-build expectation for git installs, peer/runtime dependency expectations, absence of unused Mithya install prerequisites, supported formats, host setup needed to use the built package artifact, key runtime caveats, documented customization points consumers can rely on, and the **public TypeScript type exports** available from `@file-viewer/react`. The stylesheet guidance SHALL require only the package stylesheet import and SHALL state that package styling is independent of host Tailwind scanning and CSS import order.

#### Scenario: Consumer follows install guidance

- **WHEN** a consumer follows the package README for install and host setup
- **THEN** the consumer SHALL have enough information to import `FileViewer`, satisfy peer dependencies, and import the installed package stylesheet without scanning package source files

#### Scenario: Git-based install guidance does not mention Mithya setup

- **WHEN** a consumer follows the documented GitHub install path
- **THEN** the documentation SHALL not require `@mithya/ui-registry`, `@mithya/ui-repository`, or other Mithya-specific setup unless the package explicitly adopts that tooling again

#### Scenario: Consumer installs from GitHub source

- **WHEN** a consumer follows the documented GitHub install path
- **THEN** the documentation SHALL not imply that committed `dist` output is required in the repository

#### Scenario: Consumer reaches first render from README

- **WHEN** a new consumer follows the primary usage example in the package README
- **THEN** the documentation SHALL cover install, import, a sized viewer container or parent height requirement, and the single package stylesheet import needed for the installed package

#### Scenario: Consumer checks supported files and limits

- **WHEN** a consumer reads the package README to evaluate fit
- **THEN** the documentation SHALL identify the supported file families and major current limits that affect adoption decisions

#### Scenario: Consumer uses URL string sources

- **WHEN** a consumer reads how string URL sources behave
- **THEN** the documentation SHALL state that URL sources are loaded through normal browser fetch behavior and depend on reachable URLs and compatible CORS behavior

#### Scenario: Consumer reads runtime and customization contract

- **WHEN** a consumer reads the package README for integration details
- **THEN** the documentation SHALL describe the client/browser runtime expectation, fallback and error hooks, the package stylesheet import, and the documented FileViewer-scoped theming or chrome customization surface supported by the package

#### Scenario: Consumer discovers exported TypeScript types

- **WHEN** a consumer reads the package README for TypeScript integration
- **THEN** the documentation SHALL list the types exported from `@file-viewer/react` (grouped by purpose: core, chrome, detection, renderer props, PDF search)
- **AND** SHALL state that renderer components are not part of the public API
