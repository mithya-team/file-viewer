import {
  officeZipTextDecoder as textDecoder,
  officeZipTextEncoder as textEncoder,
  readZipEntries,
  writeZipEntries,
} from "../office/officeZipArchive";

/**
 * XML parts whose rendered text and bullet definitions reach Extend's slide
 * DOM. Bullet defaults are inherited from layouts and masters, so those parts
 * are normalized alongside the slides themselves.
 */
const NORMALIZED_PART = /^ppt\/(slides|slideLayouts|slideMasters|notesSlides|notesMasters)\/[^/]+\.xml$/i;

// Numeric character references that resolve to XML-structural characters must
// stay encoded, otherwise decoding them would corrupt the document markup.
const STRUCTURAL_CODE_POINTS = new Set([0x22, 0x26, 0x27, 0x3c, 0x3e]);

const NUMERIC_CHARACTER_REFERENCE = /&#(x[0-9a-f]+|[0-9]+);/gi;

/** XML 1.0 `Char` production. Decoding a forbidden code point would make the part unparseable. */
function isXml10Char(codePoint: number): boolean {
  return (
    codePoint === 0x9 ||
    codePoint === 0xa ||
    codePoint === 0xd ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff)
  );
}

/**
 * Replace numeric character references (e.g. `&#x2022;`) with the literal
 * characters they denote. Named references (`&amp;`, `&lt;`, ...) and any
 * reference that resolves to an XML-structural or XML 1.0-illegal character
 * are left untouched.
 */
function decodeNumericCharacterReferences(xml: string): string {
  return xml.replace(NUMERIC_CHARACTER_REFERENCE, (match, body: string) => {
    const codePoint =
      body[0] === "x" || body[0] === "X"
        ? Number.parseInt(body.slice(1), 16)
        : Number.parseInt(body, 10);
    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
      return match;
    }
    if (STRUCTURAL_CODE_POINTS.has(codePoint)) return match;
    if (!isXml10Char(codePoint)) return match;
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return match;
    }
  });
}

/**
 * Extend's PPTX parser surfaces bullet `char` attributes (and other attribute
 * values) verbatim, so a valid reference such as `<a:buChar char="&#x2022;"/>`
 * is rendered as the literal text `&#x2022;` instead of a bullet glyph.
 * PptxGenJS and PowerPoint both emit bullets this way, so decode the numeric
 * references in the slide-family parts before handing the bytes to Extend.
 */
export async function normalizePptxCharacterReferences(
  input: ArrayBuffer,
): Promise<ArrayBuffer> {
  const entries = await readZipEntries(new Uint8Array(input));
  let changed = false;
  for (const entry of entries) {
    if (!NORMALIZED_PART.test(entry.name)) continue;
    const xml = textDecoder.decode(entry.bytes);
    const normalized = decodeNumericCharacterReferences(xml);
    if (normalized !== xml) {
      entry.bytes = textEncoder.encode(normalized);
      changed = true;
    }
  }
  return changed ? writeZipEntries(entries) : input;
}
