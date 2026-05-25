import JSZip from "jszip";
import { findDrawingAnchorRoot } from "./correctDocxPreviewLayout";

export type DocxDrawingPart = "body" | "header" | "footer";

export interface DocxDrawingLayer {
  part: DocxDrawingPart;
  behindDoc: boolean;
  relativeHeight: number;
  embedId: string;
}

/** Tie-break when `relativeHeight` matches (body paints above header/footer). */
const PART_RANK: Record<DocxDrawingPart, number> = {
  header: 0,
  footer: 1,
  body: 2,
};

function partFromPath(path: string): DocxDrawingPart {
  if (path.includes("/header")) return "header";
  if (path.includes("/footer")) return "footer";
  return "body";
}

const ANCHOR_WITH_BLIP_RE =
  /<(?:wp:)?anchor\b([^>]*)>([\s\S]*?)<\/(?:wp:)?anchor>/g;

function parseAnchorsFromXml(xml: string, part: DocxDrawingPart): DocxDrawingLayer[] {
  const layers: DocxDrawingLayer[] = [];

  for (const match of xml.matchAll(ANCHOR_WITH_BLIP_RE)) {
    const attrs = match[1] ?? "";
    const inner = match[2] ?? "";
    const embedId = /(?:r:embed|embed)="([^"]+)"/.exec(inner)?.[1];
    if (embedId == null || embedId === "") continue;

    layers.push({
      part,
      behindDoc: /\bbehindDoc="1"/.test(attrs),
      relativeHeight:
        Number.parseInt(/\brelativeHeight="(\d+)"/.exec(attrs)?.[1] ?? "0", 10) || 0,
      embedId,
    });
  }

  return layers;
}

async function loadDocxZip(source: Blob | ArrayBuffer | Uint8Array): Promise<JSZip> {
  if (source instanceof Blob) {
    return JSZip.loadAsync(await source.arrayBuffer());
  }
  if (source instanceof ArrayBuffer) {
    return JSZip.loadAsync(source);
  }
  return JSZip.loadAsync(source);
}

/** Light OOXML read: anchored drawings with blip embeds, in document order per part. */
export async function extractDocxDrawingLayers(
  source: Blob | ArrayBuffer | Uint8Array,
): Promise<DocxDrawingLayer[]> {
  const zip = await loadDocxZip(source);
  const paths = Object.keys(zip.files)
    .filter(
      (p) =>
        p.startsWith("word/") &&
        (p === "word/document.xml" ||
          /^word\/header\d+\.xml$/.test(p) ||
          /^word\/footer\d+\.xml$/.test(p)),
    )
    .sort();

  const layers: DocxDrawingLayer[] = [];
  for (const path of paths) {
    const file = zip.file(path);
    if (file == null) continue;
    const xml = await file.async("string");
    layers.push(...parseAnchorsFromXml(xml, partFromPath(path)));
  }

  return layers;
}

function cssZIndexForLayer(layer: DocxDrawingLayer, rank: number): number {
  return layer.behindDoc ? rank : rank + 100;
}

/** Header logo redundant with a same-height behind-doc body anchor (artwork already in page image). */
function headerLogoRedundantWithBodyBackground(
  headerLayer: DocxDrawingLayer,
  bodyLayers: DocxDrawingLayer[],
): boolean {
  const bodyBg = bodyLayers.find((l) => l.behindDoc);
  if (bodyBg == null) return false;
  return (
    headerLayer.behindDoc &&
    headerLayer.relativeHeight === bodyBg.relativeHeight
  );
}

function collectSectionImages(section: HTMLElement): {
  header: HTMLImageElement[];
  article: HTMLImageElement[];
} {
  const header = section.querySelector("header");
  const article = section.querySelector("article");
  return {
    header: header
      ? Array.from(header.querySelectorAll("img")).filter(
          (n): n is HTMLImageElement => n instanceof HTMLImageElement,
        )
      : [],
    article: article
      ? Array.from(article.querySelectorAll("img")).filter(
          (n): n is HTMLImageElement => n instanceof HTMLImageElement,
        )
      : [],
  };
}

function assignLayersToImages(
  images: HTMLImageElement[],
  layers: DocxDrawingLayer[],
  startIndex: number,
): { nextIndex: number; pairs: Array<{ img: HTMLImageElement; layer: DocxDrawingLayer }> } {
  const pairs: Array<{ img: HTMLImageElement; layer: DocxDrawingLayer }> = [];
  let index = startIndex;
  for (const img of images) {
    const layer = layers[index];
    if (layer == null) break;
    pairs.push({ img, layer });
    index += 1;
  }
  return { nextIndex: index, pairs };
}

/**
 * Stamp `data-behind-doc` and z-index from OOXML on docx-preview anchor roots.
 * Images are matched to layers in XML order per part (body queue advances per section).
 */
export function applyDocxDrawingLayers(
  host: HTMLElement,
  layers: DocxDrawingLayer[],
): void {
  if (layers.length === 0) return;

  const headerLayers = layers.filter((l) => l.part === "header");
  const bodyLayers = layers.filter((l) => l.part === "body");
  const footerLayers = layers.filter((l) => l.part === "footer");

  let bodyIndex = 0;
  const sections = Array.from(host.querySelectorAll("section.docx")).filter(
    (n): n is HTMLElement => n instanceof HTMLElement,
  );

  const allPairs: Array<{ img: HTMLImageElement; layer: DocxDrawingLayer; section: HTMLElement }> =
    [];

  for (const section of sections) {
    const { header, article } = collectSectionImages(section);

    for (let i = 0; i < header.length; i++) {
      const layer = headerLayers[i] ?? headerLayers[0];
      if (layer != null) allPairs.push({ img: header[i]!, layer, section });
    }

    const bodyAssign = assignLayersToImages(article, bodyLayers, bodyIndex);
    bodyIndex = bodyAssign.nextIndex;
    for (const { img, layer } of bodyAssign.pairs) {
      allPairs.push({ img, layer, section });
    }

    const footer = section.querySelector("footer");
    const footerImgs = footer
      ? Array.from(footer.querySelectorAll("img")).filter(
          (n): n is HTMLImageElement => n instanceof HTMLImageElement,
        )
      : [];
    for (let i = 0; i < footerImgs.length; i++) {
      const layer = footerLayers[i] ?? footerLayers[0];
      if (layer != null) allPairs.push({ img: footerImgs[i]!, layer, section });
    }
  }

  const bySection = new Map<HTMLElement, Array<{ img: HTMLImageElement; layer: DocxDrawingLayer }>>();
  for (const { img, layer, section } of allPairs) {
    const list = bySection.get(section) ?? [];
    list.push({ img, layer });
    bySection.set(section, list);
  }

  for (const [section, pairs] of bySection) {
    const uniqueHeights = [...new Set(pairs.map((p) => p.layer.relativeHeight))].sort(
      (a, b) => a - b,
    );
    const heightRank = new Map(uniqueHeights.map((h, i) => [h, i + 1]));

    let maxZ = 0;
    for (const { img, layer } of pairs) {
      const baseRank = heightRank.get(layer.relativeHeight) ?? 1;
      const tie = PART_RANK[layer.part];
      const rank = baseRank * 10 + tie;
      const z = cssZIndexForLayer(layer, rank);
      maxZ = Math.max(maxZ, z);

      const root = findDrawingAnchorRoot(img, section);
      root.dataset.behindDoc = layer.behindDoc ? "1" : "0";
      root.style.zIndex = String(z);
      img.dataset.behindDoc = layer.behindDoc ? "1" : "0";

      if (
        layer.part === "header" &&
        headerLogoRedundantWithBodyBackground(layer, bodyLayers)
      ) {
        root.dataset.fileViewerRedundantHeaderLogo = "true";
        root.style.visibility = "hidden";
        root.style.pointerEvents = "none";
      }
    }

    const pageBg = section.querySelector("[data-file-viewer-page-background]");
    if (pageBg instanceof HTMLElement) {
      const pageBgZ = Math.max(maxZ, 1);
      pageBg.style.zIndex = String(pageBgZ);
      maxZ = pageBgZ;
      const header = section.querySelector("header");
      if (header instanceof HTMLElement) {
        header.style.position = "relative";
        header.style.zIndex = "0";
      }
    }

    const article = section.querySelector("article");
    if (article instanceof HTMLElement) {
      const articleZ = article.style.zIndex;
      const articleNum = articleZ !== "" ? Number.parseInt(articleZ, 10) : 0;
      if (articleNum <= maxZ) {
        article.style.position = "relative";
        article.style.zIndex = String(maxZ + 1);
      }
    }
  }
}
