import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const PPTXJS_STYLES = [
  "https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@master/css/pptxjs.css",
  "https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@master/css/nv.d3.min.css",
];

const PPTXJS_PATCH_VERSION = "2026-03-03-text-visibility";
const PPTXJS_MAIN_SRC = `https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@master/js/pptxjs.js?v=${PPTXJS_PATCH_VERSION}`;

const PPTXJS_SCRIPTS = [
  "https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@master/js/jquery-1.11.3.min.js",
  "https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@master/js/jszip.min.js",
  "https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@master/js/filereader.js",
  "https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@master/js/d3.min.js",
  "https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@master/js/nv.d3.min.js",
  "https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@master/js/dingbat.js",
  PPTXJS_MAIN_SRC,
];

let pptxjsLoader: Promise<void> | null = null;

function loadStyleOnce(href: string) {
  const existing = document.querySelector(
    `link[data-pptxjs-style="${href}"]`,
  );
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.pptxjsStyle = href;
  document.head.appendChild(link);
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-pptxjs-script="${src}"]`,
    );
    if (existing) {
      if ((existing as HTMLScriptElement).dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.pptxjsScript = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    document.head.appendChild(script);
  });
}

function applyPptxjsPatch(source: string) {
  const offPattern =
    /var off = getTextByPathList\(slideXfrmNode, \["a:off", "attrs"\]\);\s*var x = parseInt\(off\["x"\]\) \* slideFactor;\s*var y = parseInt\(off\["y"\]\) \* slideFactor;/;
  const offReplacement = `var off = getTextByPathList(slideXfrmNode, ["a:off", "attrs"]);
if (!off) {
  off =
    getTextByPathList(slideLayoutXfrmNode, ["a:off", "attrs"]) ||
    getTextByPathList(slideMasterXfrmNode, ["a:off", "attrs"]) ||
    { x: 0, y: 0 };
}
var x = parseInt(off["x"]) * slideFactor;
var y = parseInt(off["y"]) * slideFactor;`;

  const extPattern =
    /var ext = getTextByPathList\(slideXfrmNode, \["a:ext", "attrs"\]\);\s*var w = parseInt\(ext\["cx"\]\) \* slideFactor;\s*var h = parseInt\(ext\["cy"\]\) \* slideFactor;/;
  const extReplacement = `var ext = getTextByPathList(slideXfrmNode, ["a:ext", "attrs"]);
if (!ext) {
  ext =
    getTextByPathList(slideLayoutXfrmNode, ["a:ext", "attrs"]) ||
    getTextByPathList(slideMasterXfrmNode, ["a:ext", "attrs"]) ||
    { cx: 0, cy: 0 };
}
var w = parseInt(ext["cx"]) * slideFactor;
var h = parseInt(ext["cy"]) * slideFactor;`;

  const fontColorPattern =
    /return \[color, txt_effects, colorType, highlightColor\];/;
  const fontColorReplacement = `if (typeof color === "string" && color.length === 8) {
  color = color.slice(0, 6);
}
return [color, txt_effects, colorType, highlightColor];`;

  let patched = source;
  if (!offPattern.test(patched)) {
    throw new Error("PPTXjs patch failed (off pattern)");
  }
  patched = patched.replace(offPattern, offReplacement);
  if (!extPattern.test(patched)) {
    throw new Error("PPTXjs patch failed (ext pattern)");
  }
  patched = patched.replace(extPattern, extReplacement);
  if (!fontColorPattern.test(patched)) {
    throw new Error("PPTXjs patch failed (font color pattern)");
  }
  patched = patched.replace(fontColorPattern, fontColorReplacement);
  return patched;
}

async function loadPatchedPptxjs(src: string): Promise<void> {
  const existing = document.querySelector(
    `script[data-pptxjs-script="${src}"]`,
  );
  if (existing) {
    if ((existing as HTMLScriptElement).dataset.loaded === "true") {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
    });
    return;
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to load ${src}`);
  }
  const patchedSource = applyPptxjsPatch(await response.text());
  const blobUrl = URL.createObjectURL(
    new Blob([patchedSource], { type: "text/javascript" }),
  );

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = blobUrl;
    script.async = false;
    script.dataset.pptxjsScript = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      URL.revokeObjectURL(blobUrl);
      resolve();
    });
    script.addEventListener("error", () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to load ${src}`));
    });
    document.head.appendChild(script);
  });
}

function loadPptxjsAssets(): Promise<void> {
  if (!pptxjsLoader) {
    pptxjsLoader = (async () => {
      PPTXJS_STYLES.forEach(loadStyleOnce);
      for (const src of PPTXJS_SCRIPTS) {
        if (src === PPTXJS_MAIN_SRC) {
          await loadPatchedPptxjs(src);
        } else {
          await loadScriptOnce(src);
        }
      }
    })();
  }
  return pptxjsLoader;
}

const MIN_TEXT_OPACITY = 0.35;
const MIN_TEXT_ALPHA = 0.4;
const MIN_TEXT_CONTRAST = 2.5;
const DARK_BACKGROUND_THRESHOLD = 0.4;
const slideDarkCache = new WeakMap<Element, boolean>();

type RgbaColor = { r: number; g: number; b: number; a: number };

function parseRgba(value: string): RgbaColor | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "transparent" || normalized === "none") return null;
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }
  const match = normalized.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)$/,
  );
  if (!match) return null;
  return {
    r: Number.parseInt(match[1], 10),
    g: Number.parseInt(match[2], 10),
    b: Number.parseInt(match[3], 10),
    a: match[4] ? Number.parseFloat(match[4]) : 1,
  };
}

function relativeLuminance({ r, g, b }: RgbaColor) {
  const toLinear = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const rLin = toLinear(r);
  const gLin = toLinear(g);
  const bLin = toLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

function contrastRatio(colorA: RgbaColor, colorB: RgbaColor) {
  const lumA = relativeLuminance(colorA);
  const lumB = relativeLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function isDarkColor(color: RgbaColor) {
  return relativeLuminance(color) < DARK_BACKGROUND_THRESHOLD;
}

function slideHasDarkBackground(slide: HTMLElement) {
  const cached = slideDarkCache.get(slide);
  if (cached !== undefined) return cached;

  const bgColor = getSlideBackgroundColor(slide);
  if (bgColor) {
    const isDark = isDarkColor(bgColor);
    slideDarkCache.set(slide, isDark);
    return isDark;
  }

  const shapes = [
    ...Array.from(slide.querySelectorAll<SVGRectElement>("svg rect")),
    ...Array.from(slide.querySelectorAll<SVGPathElement>("svg path")),
  ];
  for (const shape of shapes) {
    const fillAttr = shape.getAttribute("fill");
    const fillColor = fillAttr ? parseRgba(fillAttr) : null;
    const computedFill = parseRgba(window.getComputedStyle(shape).fill);
    const color = fillColor || computedFill;
    if (color && color.a > 0 && isDarkColor(color)) {
      slideDarkCache.set(slide, true);
      return true;
    }
  }

  slideDarkCache.set(slide, false);
  return false;
}

function getSlideBackgroundColor(slide: HTMLElement) {
  const computedBackground = parseRgba(
    window.getComputedStyle(slide).backgroundColor,
  );
  if (computedBackground && computedBackground.a > 0) {
    return computedBackground;
  }

  const rects = Array.from(slide.querySelectorAll<SVGRectElement>("svg rect"));
  let largestRect: SVGRectElement | null = null;
  let largestArea = 0;
  rects.forEach((rect) => {
    const width = Number.parseFloat(rect.getAttribute("width") || "0");
    const height = Number.parseFloat(rect.getAttribute("height") || "0");
    const area = width * height;
    if (area > largestArea) {
      largestArea = area;
      largestRect = rect;
    }
  });
  if (!largestRect) return null;
  const rectFill = largestRect.getAttribute("fill");
  if (rectFill) {
    const parsed = parseRgba(rectFill);
    if (parsed && parsed.a > 0) {
      return parsed;
    }
  }
  const computedFill = parseRgba(window.getComputedStyle(largestRect).fill);
  if (computedFill && computedFill.a > 0) {
    return computedFill;
  }

  const paths = Array.from(slide.querySelectorAll<SVGPathElement>("svg path"));
  let largestPath: SVGPathElement | null = null;
  let largestPathArea = 0;
  paths.forEach((path) => {
    try {
      const box = path.getBBox();
      const area = box.width * box.height;
      if (area > largestPathArea) {
        largestPathArea = area;
        largestPath = path;
      }
    } catch {
      // ignore invalid SVG paths
    }
  });
  if (!largestPath) return null;
  const pathFill = largestPath.getAttribute("fill");
  if (pathFill) {
    const parsed = parseRgba(pathFill);
    if (parsed && parsed.a > 0) {
      return parsed;
    }
  }
  const pathComputedFill = parseRgba(window.getComputedStyle(largestPath).fill);
  if (pathComputedFill && pathComputedFill.a > 0) {
    return pathComputedFill;
  }
  return null;
}

function fixHtmlTextNode(node: HTMLElement) {
  const computed = window.getComputedStyle(node);
  const opacity = Number.parseFloat(computed.opacity);
  if (Number.isFinite(opacity) && opacity > 0 && opacity < MIN_TEXT_OPACITY) {
    node.style.opacity = "1";
  }

  let ancestor = node.parentElement;
  while (ancestor && !ancestor.classList.contains("slide")) {
    const ancestorOpacity = Number.parseFloat(
      window.getComputedStyle(ancestor).opacity,
    );
    if (
      Number.isFinite(ancestorOpacity) &&
      ancestorOpacity > 0 &&
      ancestorOpacity < MIN_TEXT_OPACITY
    ) {
      ancestor.style.opacity = "1";
    }
    ancestor = ancestor.parentElement;
  }

  const color = parseRgba(computed.color);
  if (!color) return;
  if (Number.isFinite(color.a) && color.a > 0 && color.a < MIN_TEXT_ALPHA) {
    node.style.color = `rgb(${color.r}, ${color.g}, ${color.b})`;
    color.a = 1;
  }

  const slide = node.closest<HTMLElement>(".slide");
  if (!slide) return;
  if (slideHasDarkBackground(slide)) {
    node.style.color = "rgb(255, 255, 255)";
    node.style.fontWeight = "600";
    node.style.textShadow = "0 0 2px rgba(255, 255, 255, 0.6)";
  }
  const bgColor = getSlideBackgroundColor(slide);
  if (!bgColor) return;
  const ratio = contrastRatio(color, bgColor);
  if (Number.isFinite(ratio) && ratio < MIN_TEXT_CONTRAST) {
    const useLight = relativeLuminance(bgColor) < 0.5;
    const fallbackColor = useLight ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)";
    node.style.color = fallbackColor;
    node.style.fontWeight = "600";
    node.style.textShadow = useLight
      ? "0 0 2px rgba(255, 255, 255, 0.6)"
      : "0 0 2px rgba(0, 0, 0, 0.6)";
  }
}

function ensurePptxTextVisible(resultHost: HTMLElement) {
  const htmlTextNodes = new Set<HTMLElement>();
  const textTargets = resultHost.querySelectorAll<HTMLElement>(
    ".slide .slide-prgrph, .slide .slide-prgrph *, .slide div.content, .slide div.diagram-content",
  );

  textTargets.forEach((node) => {
    htmlTextNodes.add(node);
  });

  resultHost
    .querySelectorAll<HTMLElement>(".slide *")
    .forEach((node) => {
      const hasText = Array.from(node.childNodes).some(
        (child) =>
          child.nodeType === Node.TEXT_NODE &&
          child.textContent &&
          child.textContent.trim().length > 0,
      );
      if (hasText) {
        htmlTextNodes.add(node);
      }
    });

  htmlTextNodes.forEach(fixHtmlTextNode);

  const textBlocks = resultHost.querySelectorAll<HTMLElement>(".slide div.block");
  textBlocks.forEach((block) => {
    if (
      !block.querySelector(".slide-prgrph, .content, .diagram-content")
    ) {
      return;
    }
    const opacity = Number.parseFloat(window.getComputedStyle(block).opacity);
    if (Number.isFinite(opacity) && opacity > 0 && opacity < MIN_TEXT_OPACITY) {
      block.style.opacity = "1";
    }
  });

  const svgTextNodes = resultHost.querySelectorAll<SVGElement>(
    ".slide svg text, .slide svg tspan",
  );
  svgTextNodes.forEach((node) => {
    const computed = window.getComputedStyle(node);
    const opacity = Number.parseFloat(computed.opacity);
    if (Number.isFinite(opacity) && opacity > 0 && opacity < MIN_TEXT_OPACITY) {
      node.style.opacity = "1";
    }

    let ancestor = node.parentElement;
    while (ancestor && !ancestor.classList.contains("slide")) {
      const ancestorOpacity = Number.parseFloat(
        window.getComputedStyle(ancestor).opacity,
      );
      if (
        Number.isFinite(ancestorOpacity) &&
        ancestorOpacity > 0 &&
        ancestorOpacity < MIN_TEXT_OPACITY
      ) {
        ancestor.style.opacity = "1";
      }
      ancestor = ancestor.parentElement;
    }

    const fill = parseRgba(computed.fill);
    if (fill) {
      if (Number.isFinite(fill.a) && fill.a > 0 && fill.a < MIN_TEXT_ALPHA) {
        node.style.fill = `rgb(${fill.r}, ${fill.g}, ${fill.b})`;
        fill.a = 1;
      }
      const slide = node.closest<HTMLElement>(".slide");
      if (slide) {
        if (slideHasDarkBackground(slide)) {
          node.style.fill = "rgb(255, 255, 255)";
          node.style.stroke = "rgb(255, 255, 255)";
          node.style.strokeWidth = "0.5";
          node.style.paintOrder = "stroke fill";
        }
        const bgColor = getSlideBackgroundColor(slide);
        if (bgColor) {
          const ratio = contrastRatio(fill, bgColor);
          if (Number.isFinite(ratio) && ratio < MIN_TEXT_CONTRAST) {
            const useLight = relativeLuminance(bgColor) < 0.5;
        const fallbackColor = useLight
          ? "rgb(255, 255, 255)"
          : "rgb(0, 0, 0)";
        node.style.fill = fallbackColor;
        node.style.stroke = fallbackColor;
        node.style.strokeWidth = "0.5";
        node.style.paintOrder = "stroke fill";
          }
        }
      }
    }
    const fillOpacity = Number.parseFloat(computed.fillOpacity);
    if (
      Number.isFinite(fillOpacity) &&
      fillOpacity > 0 &&
      fillOpacity < MIN_TEXT_OPACITY
    ) {
      node.style.fillOpacity = "1";
    }
  });
}

interface PptxRendererProps {
  blob: Blob;
  page: number;
  zoom: number;
  onSlideCountChange?: (count: number) => void;
  onReady?: () => void;
}

export function PptxRenderer({
  blob,
  page,
  zoom,
  onSlideCountChange,
  onReady,
}: PptxRendererProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputIdRef = useRef(
    `pptxjs-input-${Math.random().toString(36).slice(2)}`,
  );
  const resultIdRef = useRef(
    `pptxjs-result-${Math.random().toString(36).slice(2)}`,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slidesReady, setSlidesReady] = useState(false);
  const slideCountRef = useRef(0);
  const textFixAppliedRef = useRef(false);
  const debugLoggedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    let observer: MutationObserver | null = null;
    let timeoutId: number | null = null;

    container.replaceChildren();
    setLoading(true);
    setError(null);
    setSlidesReady(false);
    textFixAppliedRef.current = false;

    (async () => {
      try {
        await loadPptxjsAssets();
        if (!active) return;

        const jquery = (window as any).jQuery as any;
        if (!jquery?.fn?.pptxToHtml) {
          throw new Error(t("CONSOLE.DATASOURCES.FILE_VIEWER.ERRORS.PPTX_RENDER_FAILED"));
        }

        const input = document.createElement("input");
        input.type = "file";
        input.id = inputIdRef.current;
        input.style.display = "none";

        const resultHost = document.createElement("div");
        resultHost.id = resultIdRef.current;
        resultHost.className = "h-full w-full";

        container.replaceChildren();
        container.appendChild(input);
        container.appendChild(resultHost);

        observer = new MutationObserver(() => {
          if (!active) return;
          const hasSlides = resultHost.querySelector(".slide");
          if (hasSlides) {
            setLoading(false);
            setSlidesReady(true);
            onReady?.();
            observer?.disconnect();
          }
        });
        observer.observe(resultHost, { childList: true, subtree: true });

        jquery(`#${resultIdRef.current}`).pptxToHtml({
          fileInputId: inputIdRef.current,
          slidesScale: "",
          slideMode: false,
          keyBoardShortCut: false,
          mediaProcess: true,
          themeProcess: true,
          incSlide: { width: 0, height: 0 },
        });

        const file = new File(
          [blob],
          "presentation.pptx",
          {
            type:
              blob.type ||
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          },
        );
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));

        timeoutId = window.setTimeout(() => {
          if (!active) return;
          const hasSlides = resultHost.querySelector(".slide");
          if (!hasSlides) {
            setError(t("CONSOLE.DATASOURCES.FILE_VIEWER.ERRORS.PPTX_RENDER_FAILED"));
            setLoading(false);
            onReady?.();
          }
        }, 8000);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : t("CONSOLE.DATASOURCES.FILE_VIEWER.ERRORS.PPTX_RENDER_FAILED"),
        );
        setLoading(false);
        onReady?.();
      }
    })();

    return () => {
      active = false;
      observer?.disconnect();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      container.replaceChildren();
    };
  }, [blob, t]);

  useEffect(() => {
    if (!slidesReady) return;
    const container = containerRef.current;
    if (!container) return;
    const resultHost = container.querySelector<HTMLElement>(
      `#${resultIdRef.current}`,
    );
    if (!resultHost) return;
    const slides = Array.from(
      resultHost.querySelectorAll<HTMLElement>(".slide"),
    );
    if (!slides.length) return;

    const totalSlides = slides.length;
    if (totalSlides !== slideCountRef.current) {
      slideCountRef.current = totalSlides;
      onSlideCountChange?.(totalSlides);
    }
    const textFixTimeouts: number[] = [];
    if (!textFixAppliedRef.current) {
      const applyFix = () => ensurePptxTextVisible(resultHost);
      applyFix();
      textFixTimeouts.push(
        window.setTimeout(applyFix, 250),
        window.setTimeout(applyFix, 750),
      );
      textFixAppliedRef.current = true;
    }
    if (import.meta.env.DEV && !debugLoggedRef.current) {
      const sampleNode =
        resultHost.querySelector<HTMLElement>(
          ".slide .slide-prgrph, .slide .slide-prgrph *, .slide svg text, .slide svg tspan",
        ) || resultHost.querySelector<HTMLElement>(".slide *");
      if (sampleNode) {
        const computed = window.getComputedStyle(sampleNode);
        const slide = sampleNode.closest<HTMLElement>(".slide");
        const bg = slide ? getSlideBackgroundColor(slide) : null;
        console.debug(
          "[pptx] text debug",
          JSON.stringify({
            tag: sampleNode.tagName,
            text: sampleNode.textContent?.trim().slice(0, 80),
            color: computed.color,
            opacity: computed.opacity,
            fill: computed.fill,
            fillOpacity: computed.fillOpacity,
            background: bg,
          }),
        );
      }
      debugLoggedRef.current = true;
    }
    const clampedPage = Math.min(Math.max(page, 1), totalSlides);
    const scale = zoom / 100;

    slides.forEach((slide, index) => {
      const isActive = index === clampedPage - 1;
      slide.style.display = isActive ? "block" : "none";
      slide.style.transformOrigin = "top left";
      slide.style.transform = isActive && scale !== 1 ? `scale(${scale})` : "";
    });

    const activeSlide = slides[clampedPage - 1];
    if (!activeSlide) return;
    const baseWidth = activeSlide.offsetWidth;
    const baseHeight = activeSlide.offsetHeight;
    const targetWidth = Math.max(1, Math.round(baseWidth * scale));
    const targetHeight = Math.max(1, Math.round(baseHeight * scale));

    const wrapper = resultHost.querySelector<HTMLElement>("#all_slides_warpper");
    if (wrapper) {
      wrapper.style.width = `${targetWidth}px`;
      wrapper.style.height = `${targetHeight}px`;
    } else {
      resultHost.style.minWidth = `${targetWidth}px`;
      resultHost.style.minHeight = `${targetHeight}px`;
    }
    return () => {
      textFixTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [onSlideCountChange, page, slidesReady, zoom]);

  return (
    <div className="h-full w-full overflow-auto bg-transparent relative">
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-600">
          {error}
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
