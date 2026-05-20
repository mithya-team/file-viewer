import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PdfSearchMatch } from "./pdfSearchTypes";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findAllIndices(haystack: string, needle: string): number[] {
  if (!needle) return [];
  const indices: number[] = [];
  const re = new RegExp(escapeRegExp(needle), "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(haystack)) !== null) {
    indices.push(match.index);
    if (match.index === re.lastIndex) re.lastIndex += 1;
  }
  return indices;
}

export async function scanPdfMatches(
  doc: PDFDocumentProxy,
  query: string,
  signal: AbortSignal,
): Promise<{ matches: PdfSearchMatch[]; pageStrings: Map<number, string[]> }> {
  const matches: PdfSearchMatch[] = [];
  const pageStrings = new Map<number, string[]>();

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{ str?: string }>;
    const strings = items.map((item) => item.str ?? "");
    pageStrings.set(pageNum, strings);

    const fullText = strings.join("");
    for (const index of findAllIndices(fullText, query)) {
      matches.push({
        pageNum,
        start: index,
        end: index + query.length,
      });
    }
  }

  return { matches, pageStrings };
}
