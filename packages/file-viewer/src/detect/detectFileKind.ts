import type { DetectionResult } from "../types";

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[index] !== signature[index]) return false;
  }
  return true;
}

function hasNullBytes(bytes: Uint8Array): boolean {
  return bytes.some((value) => value === 0);
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

const ZIP_LOCAL_HEADER = [0x50, 0x4b, 0x03, 0x04] as const;
const GENERIC_MIME = new Set([
  "",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
]);

function isGenericMime(mime: string): boolean {
  return GENERIC_MIME.has(mime);
}

function collectZipLocalEntryNames(bytes: Uint8Array): string[] {
  const names: string[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    if (!startsWith(bytes.subarray(offset), [...ZIP_LOCAL_HEADER])) {
      break;
    }

    const generalPurpose = view.getUint16(offset + 6, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd > bytes.length) {
      break;
    }

    names.push(new TextDecoder("utf-8").decode(bytes.subarray(nameStart, nameEnd)));

    const dataStart = nameEnd + extraLength;
    const usesDataDescriptor = (generalPurpose & 0x8) !== 0;
    if (!usesDataDescriptor || compressedSize > 0) {
      offset = dataStart + compressedSize;
      continue;
    }

    let search = dataStart;
    let found = -1;
    while (search + 4 <= bytes.length) {
      if (
        bytes[search] === 0x50
        && bytes[search + 1] === 0x4b
        && bytes[search + 2] === 0x03
        && bytes[search + 3] === 0x04
      ) {
        found = search;
        break;
      }
      // Central directory / end of central directory — stop walking locals
      if (
        bytes[search] === 0x50
        && bytes[search + 1] === 0x4b
        && (bytes[search + 2] === 0x01 || bytes[search + 2] === 0x05)
        && (bytes[search + 3] === 0x02 || bytes[search + 3] === 0x06)
      ) {
        return names;
      }
      search += 1;
    }
    if (found < 0) {
      break;
    }
    offset = found;
  }

  return names;
}

function inferOpenXmlKind(bytes: Uint8Array): "spreadsheet" | "docx" | "pptx" | null {
  const names = collectZipLocalEntryNames(bytes);
  let hasPpt = false;
  let hasWord = false;
  let hasXl = false;
  for (const name of names) {
    if (name.startsWith("ppt/")) hasPpt = true;
    else if (name.startsWith("word/")) hasWord = true;
    else if (name.startsWith("xl/")) hasXl = true;
  }
  if (hasPpt) return "pptx";
  if (hasWord) return "docx";
  if (hasXl) return "spreadsheet";
  return null;
}

function inferOleSpreadsheet(bytes: Uint8Array): boolean {
  const latin1 = new TextDecoder("latin1").decode(bytes);
  return latin1.includes("Workbook") || latin1.includes("Book");
}

function isPrintableCharacter(codePoint: number) {
  return codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d || (codePoint >= 0x20 && codePoint !== 0x7f);
}

function isProbablyText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return true;
  if (hasNullBytes(bytes)) return false;
  const decoded = decodeUtf8(bytes);
  if (decoded == null || decoded.length === 0) return false;

  let printableCount = 0;
  for (const character of decoded) {
    if (isPrintableCharacter(character.codePointAt(0) ?? 0)) {
      printableCount += 1;
    }
  }
  return printableCount / decoded.length >= 0.85;
}

const IMAGE_MIME_PREFIX = "image/";
const TEXTUAL_MIME = new Set([
  "text/plain",
  "text/csv",
  "application/json",
  "application/xml",
  "application/javascript",
]);
const MARKDOWN_MIME = new Set(["text/markdown", "text/x-markdown"]);
const HTML_MIME = "text/html";
const DOCX_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
]);
const SPREADSHEET_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);
const PPTX_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.template",
]);

function mapSpecificBinaryMime(mime: string): DetectionResult | null {
  if (mime.startsWith(IMAGE_MIME_PREFIX)) {
    return { kind: "image", mimeType: mime };
  }
  if (mime === "application/pdf") {
    return { kind: "pdf", mimeType: mime };
  }
  if (DOCX_MIME.has(mime)) {
    return { kind: "docx", mimeType: mime };
  }
  if (PPTX_MIME.has(mime)) {
    return { kind: "pptx", mimeType: mime };
  }
  if (SPREADSHEET_MIME.has(mime)) {
    return { kind: "spreadsheet", mimeType: mime };
  }
  return null;
}

function mapTextualMime(mime: string, sampleBytes: Uint8Array): DetectionResult | null {
  if (MARKDOWN_MIME.has(mime) && isProbablyText(sampleBytes)) {
    return { kind: "markdown", mimeType: mime };
  }
  if (mime === HTML_MIME && isProbablyText(sampleBytes)) {
    return { kind: "html", mimeType: mime };
  }
  if (
    (TEXTUAL_MIME.has(mime) || mime.startsWith("text/"))
    && !MARKDOWN_MIME.has(mime)
    && mime !== HTML_MIME
    && !SPREADSHEET_MIME.has(mime)
    && isProbablyText(sampleBytes)
  ) {
    return { kind: "text", mimeType: mime };
  }
  return null;
}

export async function detectFileKind(blob: Blob): Promise<DetectionResult> {
  const sampleLength = Math.min(blob.size, 1024 * 256);
  const sampleBuffer = await blob.slice(0, sampleLength).arrayBuffer();
  const sampleBytes = new Uint8Array(sampleBuffer);
  const normalizedMime = blob.type.toLowerCase();

  if (startsWith(sampleBytes, [0x25, 0x50, 0x44, 0x46])) {
    return { kind: "pdf", mimeType: normalizedMime || "application/pdf" };
  }
  if (startsWith(sampleBytes, [0xff, 0xd8, 0xff])) {
    return { kind: "image", mimeType: normalizedMime || "image/jpeg" };
  }
  if (startsWith(sampleBytes, [0x89, 0x50, 0x4e, 0x47])) {
    return { kind: "image", mimeType: normalizedMime || "image/png" };
  }
  if (startsWith(sampleBytes, [0x47, 0x49, 0x46, 0x38])) {
    return { kind: "image", mimeType: normalizedMime || "image/gif" };
  }
  if (startsWith(sampleBytes, [0x52, 0x49, 0x46, 0x46]) && sampleBytes[8] === 0x57 && sampleBytes[9] === 0x45) {
    return { kind: "image", mimeType: normalizedMime || "image/webp" };
  }
  if (startsWith(sampleBytes, [0x49, 0x49, 0x2a, 0x00])) {
    return {
      kind: "image",
      mimeType:
        normalizedMime.startsWith("image/") ? normalizedMime : "image/tiff",
    };
  }
  if (startsWith(sampleBytes, [0x4d, 0x4d, 0x00, 0x2a])) {
    return {
      kind: "image",
      mimeType:
        normalizedMime.startsWith("image/") ? normalizedMime : "image/tiff",
    };
  }
  if (startsWith(sampleBytes, [0xd0, 0xcf, 0x11, 0xe0])) {
    if (inferOleSpreadsheet(sampleBytes)) {
      return {
        kind: "spreadsheet",
        mimeType: normalizedMime || "application/vnd.ms-excel",
      };
    }
    return { kind: "unsupported", mimeType: normalizedMime || "application/octet-stream" };
  }

  if (!isGenericMime(normalizedMime)) {
    const fromSpecificMime = mapSpecificBinaryMime(normalizedMime);
    if (fromSpecificMime != null) {
      return fromSpecificMime;
    }
  }

  if (startsWith(sampleBytes, [...ZIP_LOCAL_HEADER])) {
    const openXmlKind = inferOpenXmlKind(sampleBytes);
    if (openXmlKind != null) {
      return { kind: openXmlKind, mimeType: normalizedMime || "application/zip" };
    }
  }

  const fromTextualMime = mapTextualMime(normalizedMime, sampleBytes);
  if (fromTextualMime != null) {
    return fromTextualMime;
  }

  return { kind: "unsupported", mimeType: normalizedMime || "application/octet-stream" };
}
