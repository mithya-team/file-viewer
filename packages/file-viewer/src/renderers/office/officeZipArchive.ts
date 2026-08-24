const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;

// Ceiling on total inflated bytes per archive. Normalization only needs to
// walk an Office package's entries, so a real document stays well under this,
// while a deflate bomb (attacker-authored deck opened by a victim) is refused
// before it can exhaust the browser tab's memory. On overflow readZipEntries
// throws and callers fall back to the original bytes.
const DEFAULT_MAX_INFLATED_BYTES = 512 * 1024 * 1024;

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

export type ZipEntry = {
  name: string;
  bytes: Uint8Array;
};

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

/**
 * Read every local file entry of an OOXML (ZIP) archive, inflating deflated
 * members so callers can inspect and rewrite decompressed bytes.
 */
export async function readZipEntries(
  bytes: Uint8Array,
  maxInflatedBytes = DEFAULT_MAX_INFLATED_BYTES,
): Promise<ZipEntry[]> {
  const entries: ZipEntry[] = [];
  let inflatedBudget = maxInflatedBytes;
  let offset = 0;
  while (offset + 4 <= bytes.length && readU32(bytes, offset) === LOCAL_FILE_HEADER) {
    const method = readU16(bytes, offset + 8);
    const compressedSize = readU32(bytes, offset + 18);
    const nameLength = readU16(bytes, offset + 26);
    const extraLength = readU16(bytes, offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = textDecoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const entryBytes =
      method === 0
        ? new Uint8Array(compressed)
        : method === 8
          ? await inflateRaw(compressed, inflatedBudget)
          : (() => {
              throw new Error(`Unsupported Office ZIP compression method: ${method}`);
            })();
    inflatedBudget -= entryBytes.length;
    if (inflatedBudget < 0) {
      throw new Error("Office ZIP archive exceeds the inflation limit.");
    }
    entries.push({ name, bytes: entryBytes });
    offset = dataStart + compressedSize;
  }
  if (
    entries.length === 0 ||
    (offset + 4 <= bytes.length &&
      readU32(bytes, offset) !== CENTRAL_DIRECTORY_HEADER &&
      readU32(bytes, offset) !== END_OF_CENTRAL_DIRECTORY)
  ) {
    throw new Error("Invalid Office ZIP archive.");
  }
  return entries;
}

/**
 * Write entries back into a valid ZIP archive. Members are stored uncompressed,
 * which keeps the writer dependency-free while remaining spec-compliant.
 */
export function writeZipEntries(entries: ZipEntry[]): ArrayBuffer {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = textEncoder.encode(entry.name);
    const size = entry.bytes.length;
    const checksum = crc32(entry.bytes);
    const localHeader = concat([
      writeU32(LOCAL_FILE_HEADER), writeU16(20), writeU16(0), writeU16(0),
      writeU16(0), writeU16(0), writeU32(checksum), writeU32(size), writeU32(size),
      writeU16(name.length), writeU16(0), name,
    ]);
    localParts.push(localHeader, entry.bytes);
    centralParts.push(concat([
      writeU32(CENTRAL_DIRECTORY_HEADER), writeU16(20), writeU16(20), writeU16(0),
      writeU16(0), writeU16(0), writeU16(0), writeU32(checksum), writeU32(size),
      writeU32(size), writeU16(name.length), writeU16(0), writeU16(0), writeU16(0),
      writeU16(0), writeU32(0), writeU32(offset), name,
    ]));
    offset += localHeader.length + size;
  }
  const centralDirectory = concat(centralParts);
  const end = concat([
    writeU32(END_OF_CENTRAL_DIRECTORY), writeU16(0), writeU16(0),
    writeU16(entries.length), writeU16(entries.length), writeU32(centralDirectory.length),
    writeU32(offset), writeU16(0),
  ]);
  const result = concat([...localParts, centralDirectory, end]);
  const output = new ArrayBuffer(result.byteLength);
  new Uint8Array(output).set(result);
  return output;
}

export const officeZipTextDecoder = textDecoder;
export const officeZipTextEncoder = textEncoder;
