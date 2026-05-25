/**
 * @vitest-environment happy-dom
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import {
  applyDocxDrawingLayers,
  extractDocxDrawingLayers,
  type DocxDrawingLayer,
} from "../src/renderers/docx/docxDrawingLayers";
function parseNumber(value: string): number {
  return Number.parseInt(value, 10) || 0;
}

describe("applyDocxDrawingLayers", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("stamps data-behind-doc and stacks body above header when relativeHeight ties", () => {
    const section = document.createElement("section");
    section.className = "docx";

    const header = document.createElement("header");
    const headerWrap = document.createElement("div");
    const headerImg = document.createElement("img");
    headerWrap.appendChild(headerImg);
    header.appendChild(headerWrap);

    const article = document.createElement("article");
    const bgWrap = document.createElement("div");
    const bgImg = document.createElement("img");
    bgWrap.appendChild(bgImg);
    article.appendChild(bgWrap);

    section.append(header, article);
    const host = document.createElement("div");
    host.appendChild(section);
    document.body.appendChild(host);

    const layers: DocxDrawingLayer[] = [
      {
        part: "body",
        behindDoc: true,
        relativeHeight: 251660288,
        embedId: "rId1",
      },
      {
        part: "header",
        behindDoc: true,
        relativeHeight: 251660288,
        embedId: "rId2",
      },
    ];

    applyDocxDrawingLayers(host, layers);

    expect(headerWrap.dataset.behindDoc).toBe("1");
    expect(bgWrap.dataset.behindDoc).toBe("1");
    expect(parseNumber(bgWrap.style.zIndex)).toBeGreaterThan(parseNumber(headerWrap.style.zIndex));
  });

  it("hides redundant header logo when OOXML matches body background layer", () => {
    const section = document.createElement("section");
    section.className = "docx";
    section.dataset.fileViewerPageBackground = "true";

    const header = document.createElement("header");
    const headerWrap = document.createElement("div");
    header.appendChild(headerWrap);
    headerWrap.appendChild(document.createElement("img"));

    const bgWrap = document.createElement("div");
    bgWrap.dataset.fileViewerPageBackground = "true";
    bgWrap.appendChild(document.createElement("img"));
    section.append(header, bgWrap);

    const host = document.createElement("div");
    host.appendChild(section);
    document.body.appendChild(host);

    const sharedHeight = 251660288;
    applyDocxDrawingLayers(host, [
      { part: "body", behindDoc: true, relativeHeight: sharedHeight, embedId: "rId7" },
      { part: "header", behindDoc: true, relativeHeight: sharedHeight, embedId: "rId1" },
    ]);

    expect(headerWrap.style.visibility).toBe("hidden");
    expect(headerWrap.dataset.fileViewerRedundantHeaderLogo).toBe("true");
    host.remove();
  });
});

describe("extractDocxDrawingLayers", () => {
  it("reads behindDoc and relativeHeight from the sample template", async () => {
    const path = resolve(
      import.meta.dirname,
      "../../../apps/demo/public/sample-files/dataops_sample_template_v1.docx",
    );
    const bytes = await readFile(path);
    expect(bytes.byteLength).toBeGreaterThan(10_000);
    const layers = await extractDocxDrawingLayers(bytes);
    expect(layers.length).toBeGreaterThan(0);

    const bodyBg = layers.find((l) => l.part === "body" && l.behindDoc);
    const headerLogo = layers.find((l) => l.part === "header" && l.behindDoc);

    expect(bodyBg).toBeDefined();
    expect(headerLogo).toBeDefined();
    expect(bodyBg!.relativeHeight).toBeGreaterThanOrEqual(headerLogo!.relativeHeight);
  });
});
