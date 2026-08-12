## ADDED Requirements

### Requirement: Package utilities are isolated from host utility selectors
`@file-viewer/react/styles.css` SHALL emit FileViewer-owned utility selectors only, scoped to the FileViewer root. It SHALL NOT emit unscoped generic Tailwind selectors such as `.container`, `.text-sm`, `.max-w-none`, or `.p-4`.

#### Scenario: Host imports compiled package stylesheet
- **WHEN** a host application imports `@file-viewer/react/styles.css`
- **THEN** package utility CSS SHALL apply to FileViewer markup and SHALL NOT match unrelated host markup

### Requirement: Package stylesheet has no global theme mutation
The compiled package stylesheet SHALL NOT declare Tailwind theme variables on `:root` or `:host`, and SHALL NOT expose Tailwind implementation variables in the `--tw-*` namespace.

#### Scenario: Host has a custom Tailwind v4 theme
- **WHEN** a Tailwind v4 host defines custom `--font-mono`, `--text-*`, and `--spacing` values and imports the package stylesheet
- **THEN** those host variables SHALL retain their values after package import

### Requirement: FileViewer has an opt-in scoped token bridge
The package SHALL work with package-owned fallback values when no host theme is present. It SHALL provide a documented optional bridge that maps host tokens only to `--file-viewer-*` variables on the FileViewer root.

#### Scenario: Consumer opts into host token bridge
- **WHEN** a consumer imports the optional bridge or assigns documented FileViewer variables under the viewer root
- **THEN** FileViewer SHALL use those values without mutating any host token

### Requirement: Utility collection is bounded and verified
The package build SHALL derive generated utility candidates from an explicit FileViewer-owned candidate set and SHALL NOT scan serialized whole-source fixtures.

#### Scenario: Incidental source text resembles a utility
- **WHEN** a source identifier, comment, or fixture contains a word resembling a Tailwind utility
- **THEN** that word SHALL NOT add a generated utility unless it is present in the explicit candidate set

### Requirement: Isolation is validated in a Tailwind v4 host
Package validation SHALL exercise a Tailwind v4 consumer fixture with a custom host theme and both supported CSS import orders.

#### Scenario: Host utility CSS is evaluated after package import
- **WHEN** the consumer fixture renders unrelated `.container`, `.text-sm`, and `.p-4` host markup after importing package CSS
- **THEN** the markup SHALL retain host-computed layout, typography, and spacing values
