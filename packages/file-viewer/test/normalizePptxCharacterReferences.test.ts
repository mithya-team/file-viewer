import { describe, expect, it } from "vitest";
import {
  readZipEntries,
  writeZipEntries,
  type ZipEntry,
} from "../src/renderers/office/officeZipArchive";
import { normalizePptxCharacterReferences } from "../src/renderers/pptx/normalizePptxCharacterReferences";

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
  const entries = await readZipEntries(new Uint8Array(archive));
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
});
