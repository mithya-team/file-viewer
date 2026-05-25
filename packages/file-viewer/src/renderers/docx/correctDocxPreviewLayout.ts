const NEAR_ZERO_PX = 1;
const PAGE_BACKGROUND_MIN_PT = 200;

function parseNumber(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function hasZeroInlineSize(el: HTMLElement): boolean {
  return el.style.width === "0px" && el.style.height === "0px";
}

function boxIsNearZero(el: HTMLElement): boolean {
  return el.offsetWidth <= NEAR_ZERO_PX && el.offsetHeight <= NEAR_ZERO_PX;
}

function imageHasIntrinsicSize(img: HTMLImageElement): boolean {
  return img.naturalWidth > NEAR_ZERO_PX && img.naturalHeight > NEAR_ZERO_PX;
}

function imageStyleSize(img: HTMLImageElement): { width: number; height: number } {
  const styleW = parseNumber(img.style.width);
  const styleH = parseNumber(img.style.height);
  if (styleW > NEAR_ZERO_PX && styleH > NEAR_ZERO_PX) {
    return { width: styleW, height: styleH };
  }
  if (imageHasIntrinsicSize(img)) {
    return { width: img.naturalWidth, height: img.naturalHeight };
  }
  return {
    width: Math.max(img.offsetWidth, NEAR_ZERO_PX),
    height: Math.max(img.offsetHeight, NEAR_ZERO_PX),
  };
}

/** Closest ancestor with docx-preview's zero-size wrapNone wrapper styles. */
export function findZeroSizeDrawingWrapper(
  img: HTMLImageElement,
  root: HTMLElement,
): HTMLElement | null {
  let node: HTMLElement | null = img.parentElement;
  while (node != null && node !== root) {
    if (hasZeroInlineSize(node) && node.contains(img)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Outermost drawing div between the image and the paragraph/section boundary.
 * docx-preview nests a 0px anchor wrapper and an inner inline-block div.
 */
export function findDrawingAnchorRoot(
  img: HTMLImageElement,
  boundary: HTMLElement,
): HTMLElement {
  let root: HTMLElement | null = img.parentElement;
  let node: HTMLElement | null = img.parentElement;
  while (node != null && node !== boundary) {
    if (node.tagName === "DIV") {
      root = node;
    }
    const parent = node.parentElement;
    if (
      parent === boundary ||
      parent?.tagName === "P" ||
      parent?.tagName === "SPAN" ||
      parent?.tagName === "HEADER" ||
      parent?.tagName === "ARTICLE"
    ) {
      break;
    }
    node = parent;
  }
  return root ?? img;
}

function expandZeroSizeWrapper(wrapper: HTMLElement, img: HTMLImageElement): void {
  const { width, height } = imageStyleSize(img);
  wrapper.style.overflow = "visible";
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
}

function shouldRightAlignInHeader(wrapper: HTMLElement): boolean {
  const left = wrapper.style.left;
  if (wrapper.style.right !== "" && wrapper.style.right !== "auto") return false;
  if (left === "" || left === "0px" || left === "0") return true;
  return parseNumber(left) <= NEAR_ZERO_PX;
}

function applyHeaderRightAlign(
  wrapper: HTMLElement,
  img: HTMLImageElement,
  header: HTMLElement,
): void {
  const { width, height } = imageStyleSize(img);
  expandZeroSizeWrapper(wrapper, img);

  if (header.style.position === "") {
    header.style.position = "relative";
  }

  const top = wrapper.style.top;
  wrapper.style.position = "absolute";
  wrapper.style.left = "auto";
  wrapper.style.right = "0";
  wrapper.style.top = top !== "" ? top : "0";
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
}

function isLikelyPageBackground(img: HTMLImageElement, section: HTMLElement): boolean {
  const { width, height } = imageStyleSize(img);
  const widthStyle = img.style.width;
  const heightStyle = img.style.height;
  if (widthStyle.includes("pt") && heightStyle.includes("pt")) {
    return (
      parseNumber(widthStyle) >= PAGE_BACKGROUND_MIN_PT &&
      parseNumber(heightStyle) >= PAGE_BACKGROUND_MIN_PT
    );
  }
  const sectionW = section.clientWidth > 0 ? section.clientWidth : 794;
  const sectionH = section.clientHeight > 0 ? section.clientHeight : 1123;
  if (width >= 300 && height >= 400) return true;
  return width >= sectionW * 0.45 && height >= sectionH * 0.45;
}

function ensureSectionPageBox(section: HTMLElement): void {
  section.style.position = "relative";
  section.style.overflow = "visible";
  const minHeight = section.style.minHeight;
  if (minHeight !== "" && section.style.height === "") {
    section.style.height = minHeight;
  }
}

function applyPageBackgroundLayer(
  anchorRoot: HTMLElement,
  img: HTMLImageElement,
  section: HTMLElement,
): void {
  ensureSectionPageBox(section);

  if (anchorRoot.parentElement !== section) {
    section.insertBefore(anchorRoot, section.firstElementChild);
  }

  anchorRoot.style.display = "block";
  anchorRoot.style.position = "absolute";
  anchorRoot.style.top = "0";
  anchorRoot.style.left = "0";
  anchorRoot.style.right = "0";
  anchorRoot.style.bottom = "0";
  anchorRoot.style.width = "";
  anchorRoot.style.height = "";
  anchorRoot.style.margin = "0";
  anchorRoot.style.overflow = "visible";
  anchorRoot.dataset.fileViewerPageBackground = "true";

  for (const el of anchorRoot.querySelectorAll("div")) {
    el.style.position = "absolute";
    el.style.top = "0";
    el.style.left = "0";
    el.style.right = "0";
    el.style.bottom = "0";
    el.style.width = "";
    el.style.height = "";
    el.style.display = "block";
  }

  img.style.position = "absolute";
  img.style.top = "0";
  img.style.left = "0";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.maxWidth = "none";
  img.style.objectFit = "fill";

  const article = section.querySelector("article");
  if (article instanceof HTMLElement) {
    article.style.position = "relative";
    article.style.background = "transparent";
  }
}

function collectImages(host: HTMLElement): HTMLImageElement[] {
  return Array.from(host.querySelectorAll("img"));
}

function firstDocxSection(host: HTMLElement): HTMLElement | null {
  const section = host.querySelector("section.docx");
  return section instanceof HTMLElement ? section : null;
}

/**
 * Fixes common docx-preview layout bugs: 0×0 wrapNone wrappers, clipped overflow,
 * ignored header right alignment, and behind-document backgrounds.
 */
export function correctDocxPreviewLayout(host: HTMLElement): void {
  const images = collectImages(host);
  const firstSection = firstDocxSection(host);
  let pageBackgroundApplied = false;

  for (const img of images) {
    if (img.closest("[data-file-viewer-page-background]")) {
      continue;
    }

    if (!imageHasIntrinsicSize(img) && boxIsNearZero(img)) {
      continue;
    }

    const header = img.closest("header");
    const zeroWrapper = findZeroSizeDrawingWrapper(img, host);

    if (
      !pageBackgroundApplied &&
      firstSection != null &&
      header == null &&
      firstSection.contains(img) &&
      isLikelyPageBackground(img, firstSection)
    ) {
      const anchorRoot = findDrawingAnchorRoot(img, firstSection);
      applyPageBackgroundLayer(anchorRoot, img, firstSection);
      pageBackgroundApplied = true;
      continue;
    }

    if (header instanceof HTMLElement && zeroWrapper != null && shouldRightAlignInHeader(zeroWrapper)) {
      applyHeaderRightAlign(zeroWrapper, img, header);
      continue;
    }

    if (zeroWrapper != null) {
      expandZeroSizeWrapper(zeroWrapper, img);
    }
  }

}

/** Re-run layout correction after async image decode (natural dimensions). */
export function scheduleCorrectionAfterImagesLoaded(
  host: HTMLElement,
  isActive: () => boolean,
  onAfterImagesLoaded?: () => void,
): void {
  const waiting = collectImages(host).filter((img) => !img.complete);
  if (waiting.length === 0) return;

  void Promise.all(
    waiting.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const finish = () => resolve();
          img.addEventListener("load", finish, { once: true });
          img.addEventListener("error", finish, { once: true });
        }),
    ),
  ).then(() => {
    if (!isActive()) return;
    if (onAfterImagesLoaded != null) {
      onAfterImagesLoaded();
      return;
    }
    correctDocxPreviewLayout(host);
  });
}
