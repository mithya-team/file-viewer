## ADDED Requirements

### Requirement: Detection order

`detectFileKind` SHALL select `FileKind` in this order: (1) unique binary magic signatures (PDF, JPEG, PNG, GIF, WebP, classical TIFF, OLE spreadsheet heuristics); (2) specific loaded MIME when `Blob.type` is not generic and maps to a known kind; (3) OpenXML package-root zip entry sniff for PK payloads; (4) remaining MIME-driven kinds (markdown, HTML, textual types, spreadsheet CSV MIME) with existing text guards; otherwise unsupported.

#### Scenario: Unique PDF magic beats wrong image MIME

- **WHEN** the sniff sample begins with `%PDF`
- **AND** `Blob.type` is `image/png`
- **THEN** detection SHALL return `kind: "pdf"`

#### Scenario: Specific presentation MIME beats embed xl bytes

- **WHEN** `Blob.type` is `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- **AND** the payload is a PK zip whose sample contains nested embed bytes with substring `xl/`
- **AND** unique binary magic does not match PDF/image/TIFF/OLE
- **THEN** detection SHALL return `kind: "pptx"`

### Requirement: Generic MIME is non-authoritative

Loaded MIME SHALL be treated as generic (non-authoritative for early MIME mapping) when normalized `Blob.type` is empty, `application/octet-stream`, `application/zip`, or `application/x-zip-compressed`. Generic MIME MUST NOT skip OpenXML or other sniff steps that apply to the bytes.

#### Scenario: Generic zip MIME uses OpenXML sniff

- **WHEN** `Blob.type` is `application/zip`
- **AND** outer zip entry names include a name starting with `ppt/`
- **THEN** detection SHALL return `kind: "pptx"`

#### Scenario: Empty MIME uses OpenXML sniff

- **WHEN** `Blob.type` is empty
- **AND** outer zip entry names include a name starting with `xl/` and none starting with `ppt/` or `word/`
- **THEN** detection SHALL return `kind: "spreadsheet"`

### Requirement: OpenXML package-root entry sniff

For payloads starting with PK local-file signature `50 4B 03 04`, OpenXML kind inference SHALL use filenames from zip local file headers in the sniff sample. A blob SHALL be `pptx` if any entry name starts with `ppt/`; else `docx` if any starts with `word/`; else `spreadsheet` if any starts with `xl/`. Inference MUST NOT classify from substrings found only inside nested member payloads (e.g. embedded xlsx bytes).

#### Scenario: PPTX with chart embed entries stays pptx

- **WHEN** outer entry names include `ppt/slides/slide1.xml` and `ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx`
- **AND** nested embed payload bytes contain `xl/workbook.xml`
- **AND** MIME is generic or empty
- **THEN** detection SHALL return `kind: "pptx"`

#### Scenario: Standalone xlsx still spreadsheet

- **WHEN** outer entry names include `xl/workbook.xml`
- **AND** no outer entry name starts with `ppt/` or `word/`
- **THEN** detection SHALL return `kind: "spreadsheet"`

#### Scenario: Ambiguous multi-root prefers ppt then word then xl

- **WHEN** outer entry names include both a `ppt/`-prefixed name and an `xl/`-prefixed name
- **AND** MIME is generic or empty
- **THEN** detection SHALL return `kind: "pptx"`
