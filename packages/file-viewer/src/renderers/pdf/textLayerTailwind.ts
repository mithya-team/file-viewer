import { RENDERER_VIEWPORT_CLASS } from "../rendererViewport";

/** Shared page-stack utilities for PDF and multi-page TIFF renderers. */
export const PDF_PAGE_SLOT_CLASS =
  "relative mx-auto shrink-0 rounded bg-(--file-viewer-surface,#ffffff) [box-shadow:var(--file-viewer-shadow,0_1px_2px_rgb(15_23_42/0.08))]";

export const PDF_SCROLL_ROOT_CLASS = `${RENDERER_VIEWPORT_CLASS} bg-transparent`;

export const PDF_PAGE_COLUMN_CLASS = "flex w-full flex-col items-center";
