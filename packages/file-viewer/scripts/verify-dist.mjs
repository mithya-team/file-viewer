import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(packageDir, "dist");

const requiredFiles = [
  join(distDir, "index.js"),
  join(distDir, "index.d.ts"),
  join(distDir, "file-viewer-tailwind-content.html"),
  join(packageDir, "styles.css"),
  join(packageDir, "tailwind-source.css"),
  join(packageDir, "tailwind-bridge.css"),
];

await Promise.all(requiredFiles.map((path) => access(path)));

const runtimeStyles = await readFile(join(packageDir, "styles.css"), "utf8");
const tailwindSourceStyles = await readFile(
  join(packageDir, "tailwind-source.css"),
  "utf8",
);
if (runtimeStyles.includes("@source")) {
  throw new Error("Runtime styles.css must not contain Tailwind @source directives.");
}
if (tailwindSourceStyles.includes("@source")) {
  throw new Error("Legacy Tailwind source stylesheet must not scan package content.");
}
if (/(:root|:host|--tw-)/.test(runtimeStyles)) {
  throw new Error("Runtime styles must not mutate host Tailwind theme or implementation variables.");
}
if (
  ["container", "text-sm", "max-w-none", "p-4"].some((utility) =>
    new RegExp(`^\\s*\\.${utility.replace("-", "\\-")}`, "m").test(runtimeStyles),
  )
) {
  throw new Error("Runtime styles must not emit unscoped generic utility selectors.");
}
if (!runtimeStyles.includes("[data-file-viewer-root] .flex")) {
  throw new Error("Runtime utility selectors must be scoped to FileViewer root.");
}
await import(pathToFileURL(join(distDir, "index.js")).href);

const assetFiles = await readdir(join(distDir, "assets"));
await access(fileURLToPath(import.meta.resolve("@embedpdf/pdfium/pdfium.wasm")));
if (!assetFiles.some((fileName) => fileName.endsWith(".css"))) {
  throw new Error("Bundled renderer styles are missing from dist/assets.");
}

const distFiles = await readdir(distDir);
const bundleSources = await Promise.all(
  distFiles
    .filter((fileName) => fileName.endsWith(".js"))
    .map((fileName) => readFile(join(distDir, fileName), "utf8")),
);
const bundleSource = bundleSources.join("\n");
if (!bundleSource.includes("@embedpdf/pdfium/pdfium.wasm?url&no-inline")) {
  throw new Error("Local PDFium WASM import is missing from the package output.");
}
if (!distFiles.some((fileName) => /^worker-engine-.*\.js$/.test(fileName))) {
  throw new Error("Bundled EmbedPDF worker engine chunk is missing from dist.");
}
if (!bundleSource.includes("fontFallback: null")) {
  throw new Error("EmbedPDF must disable remote fallback-font loading.");
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
  "PageNavigateEvent",
  "PageNavigateListener",
  "PDFChromeApi",
  "SpreadsheetChromeApi",
  "DocxChromeApi",
  "PptxChromeApi",
  "MarkdownChromeApi",
  "HtmlChromeApi",
  "TextChromeApi",
  "UnsupportedChromeApi",
  "StringSourceKind",
  "PdfRendererProps",
  "ImageRendererProps",
  "SpreadsheetRendererProps",
  "DocxRendererProps",
  "PptxRendererProps",
  "MarkdownRendererProps",
  "HtmlRendererProps",
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
