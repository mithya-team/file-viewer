## ADDED Requirements

### Requirement: Show loading UI while PDF document is unavailable

`PdfRenderer` SHALL display a loading status while the PDF document for the current blob has not yet loaded, independent of the `pageCount` prop from the parent.

#### Scenario: Loading UI before document resolves

- **WHEN** `PdfRenderer` is mounted with a valid blob
- **AND** `getDocument` has not yet resolved for that blob
- **THEN** the viewer SHALL display `Loading PDF...`
- **THEN** the page indicator SHALL NOT be shown

#### Scenario: Loading UI hidden after document loads

- **WHEN** `getDocument` resolves successfully
- **THEN** the loading status SHALL no longer be displayed
- **THEN** the page indicator SHALL be shown

#### Scenario: Loading UI reappears on blob change

- **WHEN** the `blob` prop changes to a new blob
- **THEN** the loading status SHALL be displayed again until the new document loads
