# DOCX Renderer Layout Specification

## Purpose

`DocxRenderer` SHALL apply post-render layout correction so anchored images, header logos, and behind-document backgrounds from DOCX/DOTX sources display correctly despite `docx-preview` wrapper and stacking bugs.

## Requirements

### Requirement: Anchored images are visible

The DOCX renderer SHALL ensure anchored images produced by `docx-preview` are visible when the source document contains valid embedded images, even when the library emits zero-width or zero-height drawing wrappers.

#### Scenario: Zero-size wrapper with valid image

- **WHEN** `docx-preview` renders a drawing wrapper with `0px` width or height containing an `img` with non-zero intrinsic dimensions
- **THEN** the layout correction pass SHALL expand the wrapper (or equivalent layout box) so the image is not clipped to zero size
- **AND** the image SHALL be displayed with non-zero layout width and height in the viewer

### Requirement: Right-aligned header images are positioned correctly

The DOCX renderer SHALL position header images that are anchored to the right margin closer to the top-right of the header region, matching common Word template layout for logos.

#### Scenario: Header logo aligned right in source document

- **WHEN** a DOCX file contains a header anchored image with horizontal alignment to the right margin (no positive left offset)
- **AND** the rendered output places the image container at the left edge with zero width
- **THEN** the layout correction pass SHALL position the image on the right side of the header area
- **AND** the image SHALL remain visible after correction

### Requirement: Behind-document backgrounds render under text

The DOCX renderer SHALL render full-page or behind-document background images beneath the main document text on the same page.

#### Scenario: Cover page with behind-document background

- **WHEN** a DOCX file contains a page-anchored background image marked behind the document body
- **AND** body text (e.g. title) is rendered above it in the same section
- **THEN** the background image SHALL be visible on that page
- **AND** the text SHALL remain readable and stacked above the background

### Requirement: Layout correction runs after each render

The DOCX renderer SHALL apply layout correction automatically after every successful `renderAsync` completion for DOCX and DOTX blobs.

#### Scenario: Document load in FileViewer

- **WHEN** `FileViewer` routes a buffered blob to the DOCX renderer
- **THEN** the renderer SHALL invoke layout correction on the render host before presenting the document as ready
- **AND** correction SHALL run again when the `blob` prop changes and the document is re-rendered

### Requirement: No public API change

The layout correction SHALL be internal to the file-viewer package and SHALL NOT add or change props on the public `FileViewer` component.

#### Scenario: Consumer integration unchanged

- **WHEN** a consumer renders `<FileViewer source={docxBlob} />`
- **THEN** the public TypeScript API SHALL remain unchanged
- **AND** improved layout SHALL require no consumer code changes
