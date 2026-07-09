import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(packageDir, "dist");

const requiredFiles = [
  join(distDir, "index.js"),
  join(distDir, "index.d.ts"),
];

await Promise.all(requiredFiles.map((path) => access(path)));

const assetFiles = await readdir(join(distDir, "assets"));
const workerAssetName = assetFiles.find((fileName) => /^pdf\.worker\.min-.*\.js$/.test(fileName));
if (workerAssetName == null) {
  throw new Error("Bundled PDF worker asset is missing from dist/assets.");
}

const bundleSource = await readFile(join(distDir, "index.js"), "utf8");
if (!bundleSource.includes(`assets/${workerAssetName}`)) {
  throw new Error("Bundled PDF worker reference is missing from dist/index.js.");
}

if (bundleSource.includes("packages/file-viewer/src")) {
  throw new Error("Workspace-only source path leaked into the built package artifact.");
}

const declarationSource = await readFile(join(distDir, "index.d.ts"), "utf8");

const requiredPublicTypes = [
  "FileViewerSource",
  "FileViewerProps",
  "FileViewerChrome",
  "FileViewerChromeApi",
  "FileViewerErrorContext",
  "FileKind",
  "DetectionResult",
  "ImageChromeApi",
  "PDFChromeApi",
  "SpreadsheetChromeApi",
  "DocxChromeApi",
  "PptxChromeApi",
  "TextChromeApi",
  "UnsupportedChromeApi",
  "StringSourceKind",
  "PdfRendererProps",
  "ImageRendererProps",
  "SpreadsheetRendererProps",
  "DocxRendererProps",
  "PptxRendererProps",
  "TextRendererProps",
  "PdfSearchMatch",
  "PdfSearchState",
];

const missingTypes = requiredPublicTypes.filter(
  (typeName) => !declarationSource.includes(typeName),
);
if (missingTypes.length > 0) {
  throw new Error(
    `dist/index.d.ts is missing public type exports: ${missingTypes.join(", ")}`,
  );
}
