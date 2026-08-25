const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP64_EOCD_MARKER = 0xffffffff;

// Ceiling on total inflated bytes per archive. Normalization only inflates the
// XML parts it inspects, so a real document stays well under this, while a
// deflate bomb (attacker-authored deck opened by a victim) is refused before
// it can exhaust the browser tab's memory. On overflow the transform throws and
// callers fall back to the original bytes.
const DEFAULT_MAX_INFLATED_BYTES = 512 * 1024 * 1024;

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

export type ZipEntry = {
  name: string;
  bytes: Uint8Array;
};

/** A member as it exists in the source archive: raw (still-compressed) bytes plus its directory metadata. */
type SourceMember = {
  name: string;
  method: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  raw: Uint8Array;
};

/** A member to write: either passed through untouched, or replaced with new (uncompressed) bytes. */
type OutputMember =
  | { kind: "raw"; source: SourceMember }
  | { kind: "replace"; name: string; bytes: Uint8Array };

export interface TransformOfficeZipOptions {
  /** Return true for parts whose text should be inflated and offered to `transformXml`. */
  shouldTransform: (name: string) => boolean;
  /** Given a part name and its decoded text, return the replacement text (unchanged text = no rewrite). */
  transformXml: (name: string, xml: string) => string;
  maxInflatedBytes?: number;
}

function readU16(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16) |
    (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function writeU16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function writeU32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function inflateRaw(bytes: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot normalize compressed Office entries.");
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        throw new Error("Office ZIP entry exceeds the inflation limit.");
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") {
    throw new Error("This browser cannot re-compress Office entries.");
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  // The EOCD record is 22 bytes plus an optional comment (<= 65535 bytes), so
  // scan backwards from the end for its signature.
  const minOffset = Math.max(0, bytes.length - (22 + 0xffff));
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readU32(bytes, offset) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error("Invalid Office ZIP archive: no end-of-central-directory record.");
}

/**
 * Read an OOXML (ZIP) package from its central directory, which carries the
 * authoritative sizes. Members are returned with their raw (still-compressed)
 * bytes and are not inflated here, so callers only pay to decompress the parts
 * they actually inspect. Central-directory sizes also make data-descriptor
 * archives (local headers with zeroed sizes) read correctly.
 */
function readSourceMembers(bytes: Uint8Array): SourceMember[] {
  const eocd = findEndOfCentralDirectory(bytes);
  const entryCount = readU16(bytes, eocd + 10);
  let cursor = readU32(bytes, eocd + 16);
  if (entryCount === 0xffff || cursor === ZIP64_EOCD_MARKER) {
    throw new Error("ZIP64 Office archives are not supported for normalization.");
  }

  const members: SourceMember[] = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > bytes.length || readU32(bytes, cursor) !== CENTRAL_DIRECTORY_HEADER) {
      throw new Error("Invalid Office ZIP archive: malformed central directory.");
    }
    const method = readU16(bytes, cursor + 10);
    const crc = readU32(bytes, cursor + 16);
    const compressedSize = readU32(bytes, cursor + 20);
    const uncompressedSize = readU32(bytes, cursor + 24);
    const nameLength = readU16(bytes, cursor + 28);
    const extraLength = readU16(bytes, cursor + 30);
    const commentLength = readU16(bytes, cursor + 32);
    const localHeaderOffset = readU32(bytes, cursor + 42);
    const nameStart = cursor + 46;
    if (nameStart + nameLength > bytes.length) {
      throw new Error("Invalid Office ZIP archive: central directory name out of range.");
    }
    const name = textDecoder.decode(bytes.subarray(nameStart, nameStart + nameLength));

    if (
      localHeaderOffset + 30 > bytes.length ||
      readU32(bytes, localHeaderOffset) !== LOCAL_FILE_HEADER
    ) {
      throw new Error("Invalid Office ZIP archive: missing local file header.");
    }
    const localNameLength = readU16(bytes, localHeaderOffset + 26);
    const localExtraLength = readU16(bytes, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > bytes.length) {
      throw new Error("Invalid Office ZIP archive: entry data out of range.");
    }
    if (method !== 0 && method !== 8) {
      throw new Error(`Unsupported Office ZIP compression method: ${method}`);
    }

    members.push({
      name,
      method,
      crc32: crc,
      compressedSize,
      uncompressedSize,
      raw: bytes.subarray(dataStart, dataStart + compressedSize),
    });
    cursor = nameStart + nameLength + extraLength + commentLength;
  }
  return members;
}

function writeMemberBytes(
  members: Array<{
    name: string;
    method: number;
    crc32: number;
    compressedSize: number;
    uncompressedSize: number;
    data: Uint8Array;
  }>,
): ArrayBuffer {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const member of members) {
    const name = textEncoder.encode(member.name);
    const localHeader = concat([
      writeU32(LOCAL_FILE_HEADER), writeU16(20), writeU16(0), writeU16(member.method),
      writeU16(0), writeU16(0), writeU32(member.crc32), writeU32(member.compressedSize),
      writeU32(member.uncompressedSize), writeU16(name.length), writeU16(0), name,
    ]);
    localParts.push(localHeader, member.data);
    centralParts.push(concat([
      writeU32(CENTRAL_DIRECTORY_HEADER), writeU16(20), writeU16(20), writeU16(0),
      writeU16(member.method), writeU16(0), writeU16(0), writeU32(member.crc32),
      writeU32(member.compressedSize), writeU32(member.uncompressedSize),
      writeU16(name.length), writeU16(0), writeU16(0), writeU16(0), writeU16(0),
      writeU32(0), writeU32(offset), name,
    ]));
    offset += localHeader.length + member.data.length;
  }
  const centralDirectory = concat(centralParts);
  const end = concat([
    writeU32(END_OF_CENTRAL_DIRECTORY), writeU16(0), writeU16(0),
    writeU16(members.length), writeU16(members.length), writeU32(centralDirectory.length),
    writeU32(offset), writeU16(0),
  ]);
  const result = concat([...localParts, centralDirectory, end]);
  const output = new ArrayBuffer(result.byteLength);
  new Uint8Array(output).set(result);
  return output;
}

async function buildOfficeZip(members: OutputMember[]): Promise<ArrayBuffer> {
  const written = [];
  for (const member of members) {
    if (member.kind === "raw") {
      const source = member.source;
      written.push({
        name: source.name,
        method: source.method,
        crc32: source.crc32,
        compressedSize: source.compressedSize,
        uncompressedSize: source.uncompressedSize,
        data: source.raw,
      });
      continue;
    }
    const deflated = await deflateRaw(member.bytes);
    written.push({
      name: member.name,
      method: 8,
      crc32: crc32(member.bytes),
      compressedSize: deflated.length,
      uncompressedSize: member.bytes.length,
      data: deflated,
    });
  }
  return writeMemberBytes(written);
}

/**
 * Inflate, transform, and re-deflate only the parts a caller cares about,
 * passing every other member through as its original compressed bytes. When no
 * part changes the original archive is returned untouched, so a preview never
 * pays to rewrite a deck that needed no fix.
 */
export async function transformOfficeZipParts(
  input: ArrayBuffer,
  options: TransformOfficeZipOptions,
): Promise<ArrayBuffer> {
  const { shouldTransform, transformXml } = options;
  const maxInflatedBytes = options.maxInflatedBytes ?? DEFAULT_MAX_INFLATED_BYTES;
  const members = readSourceMembers(new Uint8Array(input));
  const output: OutputMember[] = [];
  let inflatedBudget = maxInflatedBytes;
  let changed = false;

  for (const member of members) {
    if (!shouldTransform(member.name)) {
      output.push({ kind: "raw", source: member });
      continue;
    }
    const inflated =
      member.method === 0 ? member.raw : await inflateRaw(member.raw, inflatedBudget);
    inflatedBudget -= inflated.length;
    if (inflatedBudget < 0) {
      throw new Error("Office ZIP archive exceeds the inflation limit.");
    }
    const xml = textDecoder.decode(inflated);
    const next = transformXml(member.name, xml);
    if (next === xml) {
      output.push({ kind: "raw", source: member });
      continue;
    }
    output.push({ kind: "replace", name: member.name, bytes: textEncoder.encode(next) });
    changed = true;
  }

  if (!changed) return input;
  return buildOfficeZip(output);
}

/**
 * Build a ZIP archive from decompressed entries, stored uncompressed. Retained
 * for tests that assemble fixtures; production paths use
 * {@link transformOfficeZipParts}.
 */
export function writeZipEntries(entries: ZipEntry[]): ArrayBuffer {
  return writeMemberBytes(
    entries.map((entry) => ({
      name: entry.name,
      method: 0,
      crc32: crc32(entry.bytes),
      compressedSize: entry.bytes.length,
      uncompressedSize: entry.bytes.length,
      data: entry.bytes,
    })),
  );
}

/** Inflate and decode every part of an archive. Test/inspection helper. */
export async function readZipParts(
  bytes: Uint8Array,
  maxInflatedBytes = DEFAULT_MAX_INFLATED_BYTES,
): Promise<ZipEntry[]> {
  const members = readSourceMembers(bytes);
  const entries: ZipEntry[] = [];
  let budget = maxInflatedBytes;
  for (const member of members) {
    const inflated =
      member.method === 0 ? member.raw : await inflateRaw(member.raw, budget);
    budget -= inflated.length;
    if (budget < 0) throw new Error("Office ZIP archive exceeds the inflation limit.");
    entries.push({ name: member.name, bytes: new Uint8Array(inflated) });
  }
  return entries;
}

export const officeZipTextDecoder = textDecoder;
export const officeZipTextEncoder = textEncoder;
