## MODIFIED Requirements

### Requirement: PPTX OpenXML magic-byte detection

`detectFileKind` SHALL classify a blob as `kind: "pptx"` when the sniff sample starts with PK zip signature `50 4B 03 04` and OpenXML package-root sniff finds an outer zip entry name starting with `ppt/`, provided unique binary magic did not already select another kind and specific loaded MIME did not already map to another known kind under mime-detection rules.

#### Scenario: PPTX zip without MIME

- **WHEN** the loaded blob begins with PK zip signature
- **AND** an outer zip entry name starts with `ppt/`
- **AND** `Blob.type` is empty or generic (`application/zip`, `application/octet-stream`, `application/x-zip-compressed`)
- **THEN** detection SHALL return `kind: "pptx"`

#### Scenario: PPTX with embedded workbook stays pptx

- **WHEN** outer zip entry names include `ppt/`-prefixed paths and an embedding under `ppt/embeddings/`
- **AND** nested embed bytes contain `xl/`
- **AND** `Blob.type` is empty or generic
- **THEN** detection SHALL return `kind: "pptx"` (not `spreadsheet`)

#### Scenario: DOCX package root not stolen by pptx

- **WHEN** outer zip entry names include `word/document.xml` and none start with `ppt/`
- **THEN** detection SHALL return `kind: "docx"`

#### Scenario: XLSX package root not stolen by pptx

- **WHEN** outer zip entry names include `xl/workbook.xml` and none start with `ppt/` or `word/`
- **THEN** detection SHALL return `kind: "spreadsheet"`

### Requirement: PPTX and POTX MIME detection after sniffing

`detectFileKind` SHALL return `kind: "pptx"` when loaded MIME is `application/vnd.openxmlformats-officedocument.presentationml.presentation` or `application/vnd.openxmlformats-officedocument.presentationml.template`, evaluated after unique binary magic and as part of specific-MIME mapping (before OpenXML package-root sniff and before generic unsupported fallback).

#### Scenario: PPTX MIME on zip payload

- **WHEN** `Blob.type` is `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- **AND** magic bytes are PK zip
- **AND** unique binary magic is not PDF/image/TIFF/OLE
- **THEN** detection SHALL return `kind: "pptx"`

#### Scenario: PPTX MIME wins over embed xl substrings

- **WHEN** `Blob.type` is `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- **AND** the sniff sample contains substring `xl/` only inside nested embed payloads
- **THEN** detection SHALL return `kind: "pptx"`

#### Scenario: POTX template MIME

- **WHEN** `Blob.type` is `application/vnd.openxmlformats-officedocument.presentationml.template`
- **AND** magic bytes are PK zip
- **THEN** detection SHALL return `kind: "pptx"`
