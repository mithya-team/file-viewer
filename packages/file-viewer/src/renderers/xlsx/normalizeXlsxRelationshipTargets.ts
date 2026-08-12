const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

type ZipEntry = {
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

function relativePath(fromDirectory: string, target: string): string {
  const fromParts = fromDirectory.split("/").filter(Boolean);
  const targetParts = target.replace(/^\/+/, "").split("/").filter(Boolean);
  let common = 0;
  while (
    common < fromParts.length &&
    common < targetParts.length &&
    fromParts[common] === targetParts[common]
  ) {
    common += 1;
  }
  return [
    ...Array.from({ length: fromParts.length - common }, () => ".."),
    ...targetParts.slice(common),
  ].join("/");
}

function relationshipOwnerDirectory(relationshipPath: string): string {
  const normalized = relationshipPath.replaceAll("\\", "/");
  const marker = "/_rels/";
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex >= 0) return normalized.slice(0, markerIndex);
  return normalized.startsWith("_rels/") ? "" : normalized;
}

function normalizeRelationshipXml(xml: string, relationshipPath: string): string {
  const ownerPath = relationshipOwnerDirectory(relationshipPath);
  return xml.replace(
    /(\bTarget\s*=\s*["'])\/(?!\/)([^"']+)(["'])/gi,
    (_match, prefix: string, target: string, suffix: string) =>
      `${prefix}${relativePath(ownerPath, target)}${suffix}`,
  );
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot normalize compressed XLSX entries.");
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(bytes: Uint8Array): Promise<ZipEntry[]> {
  const entries: ZipEntry[] = [];
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
          ? await inflateRaw(compressed)
          : (() => {
              throw new Error(`Unsupported XLSX ZIP compression method: ${method}`);
            })();
    entries.push({ name, bytes: entryBytes });
    offset = dataStart + compressedSize;
  }
  if (
    entries.length === 0 ||
    (offset + 4 <= bytes.length &&
      readU32(bytes, offset) !== CENTRAL_DIRECTORY_HEADER &&
      readU32(bytes, offset) !== END_OF_CENTRAL_DIRECTORY)
  ) {
    throw new Error("Invalid XLSX ZIP archive.");
  }
  return entries;
}

function writeZipEntries(entries: ZipEntry[]): ArrayBuffer {
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

/**
 * Extend's XLSX parser expects drawing/chart relationship targets to be
 * relative. Package-absolute targets are valid OOXML, and are used by
 * report.xlsx, so normalize them before handing the bytes to Extend.
 */
export async function normalizeXlsxRelationshipTargets(
  input: ArrayBuffer,
): Promise<ArrayBuffer> {
  const entries = await readZipEntries(new Uint8Array(input));
  let changed = false;
  for (const entry of entries) {
    if (!entry.name.toLowerCase().endsWith(".rels")) continue;
    const xml = textDecoder.decode(entry.bytes);
    const normalized = normalizeRelationshipXml(xml, entry.name);
    if (normalized !== xml) {
      entry.bytes = textEncoder.encode(normalized);
      changed = true;
    }
  }
  return changed ? writeZipEntries(entries) : input;
}
