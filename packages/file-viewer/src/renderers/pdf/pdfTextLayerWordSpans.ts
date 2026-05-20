/** Word segment inside a pdf.js text run div — used for precise search highlights. */
export const PDF_WORD_SEG_CLASS = "pdf-word-seg";

const WORD_RE = /\S+|\s+/g;

/**
 * Split each text-layer run div into word (and whitespace) spans with local offsets.
 * Only call when search is active — default selection uses line-level run divs.
 */
export function wrapPdfTextLayerRunsWithWordSpans(textDivs: HTMLElement[]): void {
  for (const div of textDivs) {
    const text = div.textContent ?? "";
    if (!text) continue;

    div.replaceChildren();
    let localOffset = 0;
    const parts = text.match(WORD_RE) ?? [];
    for (const part of parts) {
      const span = document.createElement("span");
      span.className = PDF_WORD_SEG_CLASS;
      span.textContent = part;
      span.dataset.localStart = String(localOffset);
      span.dataset.localEnd = String(localOffset + part.length);
      div.appendChild(span);
      localOffset += part.length;
    }
  }
}
