// Minimal ZIP writer for tests: emits a real central directory (the production
// reader is central-directory-driven) and can optionally deflate a member or
// write it with a streaming data descriptor (general-purpose flag bit 3).

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const DATA_DESCRIPTOR = 0x08074b50;

const encoder = new TextEncoder();

export interface ZipFixtureEntry {
  name: string;
  data: Uint8Array;
  /** 0 = stored, 8 = deflate. Defaults to 8. */
  method?: 0 | 8;
  /** Write a streaming data descriptor and zero the local-header sizes. */
  dataDescriptor?: boolean;
}

function u16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
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

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function buildZipFixture(entries: ZipFixtureEntry[]): Promise<Uint8Array> {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const method = entry.method ?? 8;
    const stored = method === 8 ? await deflateRaw(entry.data) : entry.data;
    const crc = crc32(entry.data);
    const name = encoder.encode(entry.name);
    const streaming = entry.dataDescriptor === true;
    const flags = streaming ? 0x0008 : 0;

    const localHeader = concat([
      u32(LOCAL_FILE_HEADER), u16(20), u16(flags), u16(method), u16(0), u16(0),
      u32(streaming ? 0 : crc),
      u32(streaming ? 0 : stored.length),
      u32(streaming ? 0 : entry.data.length),
      u16(name.length), u16(0), name,
    ]);
    const descriptor = streaming
      ? concat([u32(DATA_DESCRIPTOR), u32(crc), u32(stored.length), u32(entry.data.length)])
      : new Uint8Array(0);

    locals.push(localHeader, stored, descriptor);
    centrals.push(concat([
      u32(CENTRAL_DIRECTORY_HEADER), u16(20), u16(20), u16(flags), u16(method),
      u16(0), u16(0), u32(crc), u32(stored.length), u32(entry.data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += localHeader.length + stored.length + descriptor.length;
  }

  const centralDirectory = concat(centrals);
  const eocd = concat([
    u32(END_OF_CENTRAL_DIRECTORY), u16(0), u16(0), u16(entries.length),
    u16(entries.length), u32(centralDirectory.length), u32(offset), u16(0),
  ]);
  return concat([...locals, centralDirectory, eocd]);
}
