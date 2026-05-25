/**
 * @vitest-environment happy-dom
 *
 * Manual QA: open demo with `dataops_sample_template_v1.docx` and confirm PCS logo
 * (top-right), cover background graphic, and readable title text.
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  correctDocxPreviewLayout,
  findDrawingAnchorRoot,
  findZeroSizeDrawingWrapper,
} from "../src/renderers/docx/correctDocxPreviewLayout";

function parseNumber(value: string): number {
  return Number.parseFloat(value) || 0;
}

function setNaturalSize(img: HTMLImageElement, width: number, height: number): void {
  Object.defineProperty(img, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(img, "naturalHeight", { value: height, configurable: true });
}

function createZeroWrapperWithImg(
  imgWidth: number,
  imgHeight: number,
  usePt = false,
): { host: HTMLElement; wrapper: HTMLElement; inner: HTMLElement; img: HTMLImageElement } {
  const host = document.createElement("div");
  const wrapper = document.createElement("div");
  wrapper.style.display = "block";
  wrapper.style.position = "relative";
  wrapper.style.width = "0px";
  wrapper.style.height = "0px";

  const inner = document.createElement("div");
  inner.style.display = "inline-block";
  inner.style.position = "relative";

  const img = document.createElement("img");
  img.src = "data:image/png;base64,aa==";
  const unit = usePt ? "pt" : "px";
  img.style.width = `${imgWidth}${unit}`;
  img.style.height = `${imgHeight}${unit}`;
  setNaturalSize(img, imgWidth, imgHeight);

  inner.appendChild(img);
  wrapper.appendChild(inner);
  host.appendChild(wrapper);
  document.body.appendChild(host);
  return { host, wrapper, inner, img };
}

describe("findZeroSizeDrawingWrapper", () => {
  it("finds parent with 0px width and height", () => {
    const { host, wrapper, img } = createZeroWrapperWithImg(100, 40);
    expect(findZeroSizeDrawingWrapper(img, host)).toBe(wrapper);
    host.remove();
  });
});

describe("findDrawingAnchorRoot", () => {
  it("returns outermost div before paragraph boundary", () => {
    const section = document.createElement("section");
    const p = document.createElement("p");
    const { wrapper, inner, img } = createZeroWrapperWithImg(595, 842);
    p.appendChild(wrapper);
    section.appendChild(p);
    expect(findDrawingAnchorRoot(img, section)).toBe(wrapper);
    expect(findDrawingAnchorRoot(img, section)).not.toBe(inner);
    wrapper.remove();
  });
});

describe("correctDocxPreviewLayout", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("expands zero-size wrapper so image box is non-zero", () => {
    const section = document.createElement("section");
    section.className = "docx";
    const article = document.createElement("article");
    const { host, wrapper, img } = createZeroWrapperWithImg(200, 200);
    article.appendChild(wrapper);
    section.appendChild(article);
    host.appendChild(section);
    document.body.appendChild(host);

    correctDocxPreviewLayout(host);

    expect(parseNumber(wrapper.style.width)).toBeGreaterThan(0);
    expect(parseNumber(wrapper.style.height)).toBeGreaterThan(0);
    expect(wrapper.style.overflow).toBe("visible");
    host.remove();
  });

  it("right-aligns header logo wrapper", () => {
    const section = document.createElement("section");
    section.className = "docx";
    const header = document.createElement("header");
    const { host, wrapper, img } = createZeroWrapperWithImg(94, 40);
    wrapper.style.top = "10px";
    header.appendChild(wrapper);
    section.appendChild(header);
    section.appendChild(document.createElement("article"));
    host.appendChild(section);
    document.body.appendChild(host);

    correctDocxPreviewLayout(host);

    expect(wrapper.style.position).toBe("absolute");
    expect(parseNumber(wrapper.style.right)).toBe(0);
    expect(wrapper.style.left).toBe("auto");
    host.remove();
  });

  it("reparents page background to section and fills the page box", () => {
    const section = document.createElement("section");
    section.className = "docx";
    section.style.minHeight = "842pt";
    section.style.width = "595.3pt";

    const article = document.createElement("article");
    const { host, wrapper, img } = createZeroWrapperWithImg(595.3, 841.9, true);
    const p = document.createElement("p");
    p.appendChild(wrapper);
    article.appendChild(p);
    section.appendChild(article);
    host.appendChild(section);
    document.body.appendChild(host);

    correctDocxPreviewLayout(host);

    expect(wrapper.parentElement).toBe(section);
    expect(section.firstElementChild).toBe(wrapper);
    expect(wrapper.style.position).toBe("absolute");
    expect(parseNumber(wrapper.style.bottom)).toBe(0);
    expect(img.style.width).toBe("100%");
    expect(img.style.height).toBe("100%");
    expect(section.style.height).toBe("842pt");
    expect(section.style.overflow).toBe("visible");
    host.remove();
  });

  it("does not hide header logo on cover-like sections", () => {
    const section = document.createElement("section");
    section.className = "docx";
    section.style.minHeight = "842pt";

    const header = document.createElement("header");
    const logo = createZeroWrapperWithImg(94, 40);
    header.appendChild(logo.wrapper);

    const article = document.createElement("article");
    const bg = createZeroWrapperWithImg(595.3, 841.9, true);
    const p = document.createElement("p");
    p.appendChild(bg.wrapper);
    article.appendChild(p);

    const host = document.createElement("div");
    section.appendChild(header);
    section.appendChild(article);
    host.appendChild(section);
    document.body.appendChild(host);

    correctDocxPreviewLayout(host);

    expect(logo.wrapper.style.display).not.toBe("none");
    host.remove();
  });
});
