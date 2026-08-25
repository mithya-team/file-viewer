import { describe, expect, it } from "vitest";
import {
  readZipParts,
  transformOfficeZipParts,
} from "../src/renderers/office/officeZipArchive";
import { buildZipFixture } from "./support/zipFixtures";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const upperTransform = {
  shouldTransform: (name: string) => name.endsWith(".xml"),
  transformXml: (_name: string, xml: string) => xml.toUpperCase(),
};

describe("transformOfficeZipParts", () => {
  it("only inflates parts it inspects and passes media through untouched", async () => {
    const media = crypto.getRandomValues(new Uint8Array(64 * 1024)); // incompressible
    const archive = await buildZipFixture([
      { name: "ppt/slides/slide1.xml", data: encoder.encode("<a:t>hi</a:t>"), method: 8 },
      { name: "ppt/media/image1.png", data: media, method: 0 },
    ]);

    const output = await transformOfficeZipParts(archive.buffer as ArrayBuffer, {
      shouldTransform: (name) => name.startsWith("ppt/slides/"),
      transformXml: (_name, xml) => xml.replace("hi", "bye"),
    });

    const parts = await readZipParts(new Uint8Array(output));
    expect(decoder.decode(parts.find((p) => p.name === "ppt/slides/slide1.xml")!.bytes)).toContain(
      "bye",
    );
    // Media survives byte-for-byte even though the normalizer never inspected it.
    expect(parts.find((p) => p.name === "ppt/media/image1.png")!.bytes).toEqual(media);
  });

  it("returns the original buffer when no inspected part changes", async () => {
    const archive = await buildZipFixture([
      { name: "ppt/slides/slide1.xml", data: encoder.encode("<a:t>hi</a:t>"), method: 8 },
    ]);
    const input = archive.buffer as ArrayBuffer;

    const output = await transformOfficeZipParts(input, {
      shouldTransform: (name) => name.startsWith("ppt/slides/"),
      transformXml: (_name, xml) => xml, // no change
    });

    expect(output).toBe(input);
  });

  it("re-deflates rewritten parts instead of bloating the archive", async () => {
    const big = encoder.encode("<a:t>" + "spam ".repeat(50_000) + "</a:t>");
    const archive = await buildZipFixture([{ name: "ppt/slides/slide1.xml", data: big, method: 8 }]);
    const input = archive.buffer as ArrayBuffer;

    const output = await transformOfficeZipParts(input, upperTransform);

    // A stored (uncompressed) rewrite of 250 KB of text would dwarf the input;
    // re-deflation keeps the output in the same ballpark.
    expect(output.byteLength).toBeLessThan(big.length);
    const parts = await readZipParts(new Uint8Array(output));
    expect(decoder.decode(parts[0]!.bytes)).toContain("SPAM");
  });

  it("reads entries written with a streaming data descriptor", async () => {
    const archive = await buildZipFixture([
      {
        name: "ppt/slides/slide1.xml",
        data: encoder.encode('<a:buChar char="&#x2022;"/>'),
        method: 8,
        dataDescriptor: true,
      },
    ]);

    const output = await transformOfficeZipParts(archive.buffer as ArrayBuffer, {
      shouldTransform: (name) => name.endsWith(".xml"),
      transformXml: (_name, xml) => xml.replace("&#x2022;", "•"),
    });

    const parts = await readZipParts(new Uint8Array(output));
    expect(decoder.decode(parts[0]!.bytes)).toContain('char="•"');
  });

  it("refuses a deflated entry that inflates past the cap", async () => {
    const oneMib = new Uint8Array(1024 * 1024); // zeros → tiny compressed, large inflated
    const archive = await buildZipFixture([{ name: "a.xml", data: oneMib, method: 8 }]);

    await expect(
      transformOfficeZipParts(archive.buffer as ArrayBuffer, {
        ...upperTransform,
        maxInflatedBytes: 64 * 1024,
      }),
    ).rejects.toThrow(/inflation limit/i);
  });

  it("rejects a malformed central directory", async () => {
    const archive = await buildZipFixture([{ name: "a.xml", data: encoder.encode("x") }]);
    archive[archive.length - 6] = 0xff; // corrupt the central-directory offset in the EOCD

    await expect(readZipParts(archive)).rejects.toThrow(/Invalid Office ZIP/i);
  });
});
