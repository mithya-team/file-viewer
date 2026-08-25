import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  readZipParts,
  writeZipEntries,
  type ZipEntry,
} from "../src/renderers/office/officeZipArchive";
import { normalizePptxCharacterReferences } from "../src/renderers/pptx/normalizePptxCharacterReferences";
import { buildZipFixture } from "./support/zipFixtures";

const WAYGROUND_PPTX = resolve(
  import.meta.dirname,
  "../../../sample-files/Wayground_CSM_Assignment_Slides.pptx",
);
const MEDIA_HEAVY_PPTX = resolve(import.meta.dirname, "../../../sample-files/sample-4.pptx");

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function buildPptx(parts: Record<string, string>): ArrayBuffer {
  const entries: ZipEntry[] = Object.entries(parts).map(([name, xml]) => ({
    name,
    bytes: encoder.encode(xml),
  }));
  return writeZipEntries(entries);
}

async function readPart(archive: ArrayBuffer, name: string): Promise<string> {
  const entries = await readZipParts(new Uint8Array(archive));
  const entry = entries.find((candidate) => candidate.name === name);
  if (entry == null) throw new Error(`missing part ${name}`);
  return decoder.decode(entry.bytes);
}

describe("normalizePptxCharacterReferences", () => {
  it("decodes bullet char numeric references into literal glyphs", async () => {
    const input = buildPptx({
      "ppt/slides/slide1.xml":
        '<a:pPr><a:buChar char="&#x2022;"/></a:pPr><a:t>Item</a:t>',
    });

    const output = await normalizePptxCharacterReferences(input);
    const slide = await readPart(output, "ppt/slides/slide1.xml");

    expect(slide).toContain('char="•"');
    expect(slide).not.toContain("&#x2022;");
  });

  it("decodes decimal references and normalizes layouts and masters", async () => {
    const input = buildPptx({
      "ppt/slideLayouts/slideLayout1.xml": '<a:buChar char="&#8226;"/>',
      "ppt/slideMasters/slideMaster1.xml": '<a:buChar char="&#x25AA;"/>',
    });

    const output = await normalizePptxCharacterReferences(input);

    expect(await readPart(output, "ppt/slideLayouts/slideLayout1.xml")).toContain(
      'char="•"',
    );
    expect(await readPart(output, "ppt/slideMasters/slideMaster1.xml")).toContain(
      'char="▪"',
    );
  });

  it("preserves XML-structural references so markup stays valid", async () => {
    const xml =
      '<a:t>R&amp;D &lt;core&gt; &#38; &#x3C;tag&#x3E; &#34;q&#34;</a:t>';
    const input = buildPptx({ "ppt/slides/slide1.xml": xml });

    const output = await normalizePptxCharacterReferences(input);
    const slide = await readPart(output, "ppt/slides/slide1.xml");

    expect(slide).toBe(xml);
  });

  it("leaves parts outside the slide family untouched", async () => {
    const input = buildPptx({
      "docProps/app.xml": "<Company>&#x2022;</Company>",
      "ppt/slides/slide1.xml": "<a:t>plain</a:t>",
    });

    const output = await normalizePptxCharacterReferences(input);

    expect(await readPart(output, "docProps/app.xml")).toContain("&#x2022;");
  });

  it("returns the original buffer when nothing needs decoding", async () => {
    const input = buildPptx({
      "ppt/slides/slide1.xml": "<a:t>no references here</a:t>",
    });

    const output = await normalizePptxCharacterReferences(input);

    expect(output).toBe(input);
  });

  it("leaves XML 1.0-illegal numeric references encoded", async () => {
    const xml =
      '<a:t>&#x0; &#x8; &#xB; &#xC; &#x1F; &#xFFFE; &#xD800;</a:t><a:buChar char="&#x2022;"/>';
    const input = buildPptx({ "ppt/slides/slide1.xml": xml });

    const output = await normalizePptxCharacterReferences(input);
    const slide = await readPart(output, "ppt/slides/slide1.xml");

    expect(slide).toContain("&#x0;");
    expect(slide).toContain("&#x8;");
    expect(slide).toContain("&#xB;");
    expect(slide).toContain("&#xC;");
    expect(slide).toContain("&#x1F;");
    expect(slide).toContain("&#xFFFE;");
    expect(slide).toContain("&#xD800;");
    expect(slide).toContain('char="•"');
    expect(slide).not.toContain("\u0000");
  });

  it("decodes encoded bullets in the reported Wayground deck", async () => {
    const bytes = readFileSync(WAYGROUND_PPTX);
    const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const output = await normalizePptxCharacterReferences(input);
    const before = await readZipParts(new Uint8Array(input));
    const after = await readZipParts(new Uint8Array(output));

    expect(after.map((entry) => entry.name)).toEqual(before.map((entry) => entry.name));

    const slide11Before = decoder.decode(
      before.find((entry) => entry.name === "ppt/slides/slide11.xml")!.bytes,
    );
    const slide11After = decoder.decode(
      after.find((entry) => entry.name === "ppt/slides/slide11.xml")!.bytes,
    );

    expect(slide11Before).toContain('char="&#x2022;"');
    expect(slide11After).toContain('char="•"');
    expect(slide11After).not.toContain("&#x2022;");
  });

  it("keeps whitespace-control references encoded so attribute values are unchanged", async () => {
    const xml = '<a:t descr="a&#9;b&#10;c&#13;d">&#x2022; item</a:t>';
    const input = buildPptx({ "ppt/slides/slide1.xml": xml });

    const output = await normalizePptxCharacterReferences(input);
    const slide = await readPart(output, "ppt/slides/slide1.xml");

    expect(slide).toContain("&#9;");
    expect(slide).toContain("&#10;");
    expect(slide).toContain("&#13;");
    expect(slide).toContain("• item"); // the bullet still decodes
  });

  it("keeps control and format references encoded to prevent display spoofing", async () => {
    const xml =
      '<a:t>&#x202E; rtl &#x200B; zwsp &#x80; c1 &#xFEFF; bom &#x2022; bullet</a:t>';
    const input = buildPptx({ "ppt/slides/slide1.xml": xml });

    const output = await normalizePptxCharacterReferences(input);
    const slide = await readPart(output, "ppt/slides/slide1.xml");

    expect(slide).toContain("&#x202E;"); // RIGHT-TO-LEFT OVERRIDE (bidi)
    expect(slide).toContain("&#x200B;"); // ZERO WIDTH SPACE
    expect(slide).toContain("&#x80;"); // C1 control
    expect(slide).toContain("&#xFEFF;"); // ZERO WIDTH NO-BREAK SPACE
    expect(slide).toContain("• bullet"); // visible glyph still decodes
    expect(slide).not.toContain(String.fromCodePoint(0x202e));
    expect(slide).not.toContain(String.fromCodePoint(0x200b));
  });

  it("applies the fix to a slide written with a streaming data descriptor", async () => {
    const archive = await buildZipFixture([
      {
        name: "[Content_Types].xml",
        data: encoder.encode("<Types/>"),
        method: 8,
        dataDescriptor: true,
      },
      {
        name: "ppt/slides/slide1.xml",
        data: encoder.encode('<a:pPr><a:buChar char="&#x2022;"/></a:pPr>'),
        method: 8,
        dataDescriptor: true,
      },
    ]);

    const output = await normalizePptxCharacterReferences(archive.buffer as ArrayBuffer);
    const slide = await readPart(output, "ppt/slides/slide1.xml");

    expect(slide).toContain('char="•"');
    expect(slide).not.toContain("&#x2022;");
  });

  it("does not bloat a large media-heavy deck", async () => {
    const bytes = readFileSync(MEDIA_HEAVY_PPTX);
    const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    const output = await normalizePptxCharacterReferences(input);

    // If nothing needed decoding the exact input is returned; if a slide was
    // rewritten the archive is re-deflated, never stored uncompressed, so the
    // output stays close to the original size rather than exploding. Byte-exact
    // media pass-through is covered in officeZipArchive.test.ts.
    expect(output.byteLength).toBeLessThan(input.byteLength * 1.2);
    const after = await readZipParts(new Uint8Array(output));
    expect(after.some((e) => e.name.startsWith("ppt/media/"))).toBe(true);
  }, 30_000);
});
