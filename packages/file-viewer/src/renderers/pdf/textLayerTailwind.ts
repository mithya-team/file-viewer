import { RENDERER_VIEWPORT_CLASS } from "../rendererViewport";

/**
 * pdf.js TextLayer positioning without pdf.js CSS.
 * Host apps must import `@file-viewer/react/styles.css` (or scan package sources).
 * These mirror pdf.js `.textLayer` essentials.
 *
 * - Container: absolute inset-0, pointer-events-auto, `--scale-factor` set before render
 * - pdf.js sets per-span position via inline styles during TextLayer.render()
 * - Spans use `white-space: pre` (not pre-wrap) — each run is single-line; wrapping overlaps lines
 * - Word segments: `pdf-word-seg` class only when search is active
 */
export const TEXT_LAYER_CONTAINER_CLASS =
  "textLayer pointer-events-auto absolute inset-0 z-10 overflow-hidden opacity-100 leading-none [text-size-adjust:none] forced-color-adjust-none [&_span]:absolute [&_br]:absolute [&_:is(span,br)]:whitespace-pre [&_:is(span,br)]:text-transparent [&_span]:transform-origin-[0_0] [&_*::selection]:bg-blue-500/25 [&_br::selection]:bg-transparent";

export const PDF_PAGE_SLOT_CLASS =
  "relative mx-auto shrink-0 rounded bg-(--file-viewer-surface,#ffffff) [box-shadow:var(--file-viewer-shadow,0_1px_2px_rgb(15_23_42/0.08))]";

export const PDF_SCROLL_ROOT_CLASS = `${RENDERER_VIEWPORT_CLASS} bg-transparent`;

export const PDF_PAGE_COLUMN_CLASS = "flex w-full flex-col items-center";

export const PDF_CANVAS_CLASS =
  "pointer-events-none absolute inset-0 z-0 block max-h-none max-w-none";
