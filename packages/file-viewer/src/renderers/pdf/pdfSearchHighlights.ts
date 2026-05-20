import type { TextLayer } from "pdfjs-dist";
import {
  PDF_SEARCH_ACTIVE_CLASS,
  PDF_SEARCH_HIT_CLASS,
  SEARCH_ACTIVE_BG,
  SEARCH_HIT_BG,
} from "./searchHighlightColors";
import type { PdfSearchMatch } from "./pdfSearchTypes";
import { PDF_WORD_SEG_CLASS } from "./pdfTextLayerWordSpans";

export function textLayerStringRuns(
  textLayer: TextLayer,
  fallback: string[] | undefined,
): string[] | undefined {
  const runs = (
    textLayer as unknown as { textContentItemsStr?: string[] }
  ).textContentItemsStr;
  if (runs != null && runs.length > 0) return runs;
  return fallback;
}

export function clearHitStyles(textLayer: TextLayer): void {
  for (const div of textLayer.textDivs) {
    div.classList.remove(PDF_SEARCH_HIT_CLASS, PDF_SEARCH_ACTIVE_CLASS);
    div.style.backgroundColor = "";
    for (const seg of div.querySelectorAll<HTMLElement>(`.${PDF_WORD_SEG_CLASS}`)) {
      seg.classList.remove(PDF_SEARCH_HIT_CLASS, PDF_SEARCH_ACTIVE_CLASS);
      seg.style.backgroundColor = "";
    }
  }
}

export function charRangeToStringIndices(
  strings: string[],
  start: number,
  end: number,
): number[] {
  const indices: number[] = [];
  let acc = 0;
  for (let i = 0; i < strings.length; i++) {
    const len = strings[i].length;
    const runStart = acc;
    const runEnd = acc + len;
    if (runEnd > start && runStart < end) {
      indices.push(i);
    }
    acc = runEnd;
  }
  return indices;
}

export function applyHighlightsForPage(
  pageNum: number,
  textLayer: TextLayer,
  strings: string[] | undefined,
  matches: PdfSearchMatch[],
  activeIdx: number,
): void {
  clearHitStyles(textLayer);
  const forRange = textLayerStringRuns(textLayer, strings);
  if (!forRange?.length) return;

  const divs = textLayer.textDivs;
  const runStarts: number[] = new Array(forRange.length);
  let acc = 0;
  for (let r = 0; r < forRange.length; r++) {
    runStarts[r] = acc;
    acc += forRange[r].length;
  }

  for (let mi = 0; mi < matches.length; mi++) {
    const m = matches[mi];
    if (m.pageNum !== pageNum) continue;
    const indices = charRangeToStringIndices(forRange, m.start, m.end);
    const isActive = mi === activeIdx;
    const bg = isActive ? SEARCH_ACTIVE_BG : SEARCH_HIT_BG;

    for (const idx of indices) {
      const div = divs[idx];
      if (!div) continue;
      const runLen = forRange[idx].length;
      const runStart = runStarts[idx];
      const localStart = Math.max(0, m.start - runStart);
      const localEnd = Math.min(runLen, m.end - runStart);
      if (localStart >= localEnd) continue;

      const segs = div.querySelectorAll<HTMLElement>(`.${PDF_WORD_SEG_CLASS}`);
      if (segs.length === 0) {
        div.classList.add(PDF_SEARCH_HIT_CLASS);
        div.style.backgroundColor = bg;
        if (isActive) div.classList.add(PDF_SEARCH_ACTIVE_CLASS);
        continue;
      }

      for (const seg of segs) {
        const segStart = Number(seg.dataset.localStart);
        const segEnd = Number(seg.dataset.localEnd);
        if (
          Number.isFinite(segStart)
          && Number.isFinite(segEnd)
          && segEnd > localStart
          && segStart < localEnd
        ) {
          seg.classList.add(PDF_SEARCH_HIT_CLASS);
          seg.style.backgroundColor = bg;
          if (isActive) seg.classList.add(PDF_SEARCH_ACTIVE_CLASS);
        }
      }
    }
  }
}
