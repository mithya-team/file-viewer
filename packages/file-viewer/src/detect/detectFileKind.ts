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

function inferOpenXmlKind(bytes: Uint8Array): "spreadsheet" | "docx" | null {
  const latin1 = new TextDecoder("latin1").decode(bytes);
  if (latin1.includes("xl/")) return "spreadsheet";
  if (latin1.includes("word/")) return "docx";
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
const DOCX_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
]);
const SPREADSHEET_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);

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
  if (startsWith(sampleBytes, [0xd0, 0xcf, 0x11, 0xe0])) {
    if (inferOleSpreadsheet(sampleBytes)) {
      return {
        kind: "spreadsheet",
        mimeType: normalizedMime || "application/vnd.ms-excel",
      };
    }
    return { kind: "unsupported", mimeType: normalizedMime || "application/octet-stream" };
  }
  if (startsWith(sampleBytes, [0x50, 0x4b, 0x03, 0x04])) {
    const openXmlKind = inferOpenXmlKind(sampleBytes);
    if (openXmlKind != null) {
      return { kind: openXmlKind, mimeType: normalizedMime || "application/zip" };
    }
  }

  if (normalizedMime.startsWith(IMAGE_MIME_PREFIX)) {
    return { kind: "image", mimeType: normalizedMime };
  }
  if (normalizedMime === "application/pdf") {
    return { kind: "pdf", mimeType: normalizedMime };
  }
  if (DOCX_MIME.has(normalizedMime)) {
    return { kind: "docx", mimeType: normalizedMime };
  }
  if (SPREADSHEET_MIME.has(normalizedMime)) {
    return { kind: "spreadsheet", mimeType: normalizedMime };
  }
  if ((TEXTUAL_MIME.has(normalizedMime) || normalizedMime.startsWith("text/")) && isProbablyText(sampleBytes)) {
    return { kind: "text", mimeType: normalizedMime };
  }

  return { kind: "unsupported", mimeType: normalizedMime || "application/octet-stream" };
}
