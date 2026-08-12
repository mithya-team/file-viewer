## ADDED Requirements

### Requirement: DOCX and DOTX render through the pinned Extend document primitive

`DocxRenderer` SHALL remain internal and SHALL render normalized DOCX and DOTX blobs through the pinned `@extend-ai/react-docx` primitive. It SHALL provide an in-memory file representation to the renderer and SHALL not require a URL, filename extension, or consumer MIME prop for routing.

#### Scenario: Buffered DOTX uses DOCX path

- **WHEN** FileViewer detects a buffered template blob as `kind: "docx"`
- **THEN** `DocxRenderer` SHALL render it through the same Extend document path as DOCX
- **THEN** template behavior and embedded actions SHALL not execute

#### Scenario: Renderer failure uses package fallback

- **WHEN** the Extend document primitive reports a document render failure
- **THEN** `DocxRenderer` SHALL report an `Error` to FileViewer
- **THEN** FileViewer SHALL present its normal render fallback

## REMOVED Requirements

### Requirement: Layout correction runs after each render

**Reason**: The replacement does not use `docx-preview` or its generated drawing wrappers, so a post-`renderAsync` correction pass is not a valid renderer contract.

**Migration**: Preserve the anchored-image, header-image, and background visual requirements through fixture-based validation of the Extend document primitive; consumers make no API changes.

