import { describe, expect, it } from "vitest";
import {
  readZipEntries,
  writeZipEntries,
  type ZipEntry,
} from "../src/renderers/office/officeZipArchive";

const LOCAL_FILE_HEADER = 0x04034b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;

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

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Assemble a single-entry archive whose member is deflate-compressed (method 8). */
async function buildDeflatedArchive(name: string, data: Uint8Array): Promise<Uint8Array> {
  const compressed = await deflateRaw(data);
  const nameBytes = new TextEncoder().encode(name);
  const localHeader = concat([
    u32(LOCAL_FILE_HEADER), u16(20), u16(0), u16(8), u16(0), u16(0),
    u32(0), u32(compressed.length), u32(data.length),
    u16(nameBytes.length), u16(0), nameBytes,
  ]);
  const eocd = concat([u32(END_OF_CENTRAL_DIRECTORY), new Uint8Array(18)]);
  return concat([localHeader, compressed, eocd]);
}

describe("officeZipArchive inflation cap", () => {
  it("refuses a deflated entry that inflates past the cap", async () => {
    const oneMib = new Uint8Array(1024 * 1024); // all zeros → tiny compressed, large inflated
    const archive = await buildDeflatedArchive("ppt/slides/slide1.xml", oneMib);

    await expect(readZipEntries(archive, 64 * 1024)).rejects.toThrow(/inflation limit/i);
  });

  it("inflates the same entry when the cap allows it", async () => {
    const oneMib = new Uint8Array(1024 * 1024);
    const archive = await buildDeflatedArchive("ppt/slides/slide1.xml", oneMib);

    const entries = await readZipEntries(archive, 4 * 1024 * 1024);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.name).toBe("ppt/slides/slide1.xml");
    expect(entries[0]!.bytes.length).toBe(oneMib.length);
  });

  it("refuses when stored entries together exceed the cap", async () => {
    const entries: ZipEntry[] = [
      { name: "a.bin", bytes: new Uint8Array(200 * 1024) },
      { name: "b.bin", bytes: new Uint8Array(200 * 1024) },
    ];
    const archive = new Uint8Array(writeZipEntries(entries));

    await expect(readZipEntries(archive, 256 * 1024)).rejects.toThrow(/inflation limit/i);
  });
});
