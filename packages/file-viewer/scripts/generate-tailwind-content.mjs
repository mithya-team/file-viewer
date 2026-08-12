import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(packageDir, "src");
const outputPath = join(packageDir, "dist", "file-viewer-tailwind-content.html");
const sourceExtensions = new Set([".ts", ".tsx"]);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf("."))) ? [path] : [];
  }));
  return nested.flat();
}

const sourceFiles = await collectSourceFiles(sourceDir);
const source = await Promise.all(sourceFiles.map((path) => readFile(path, "utf8")));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `<!-- Tailwind scan content generated from ${sourceFiles.length} package source files. -->\n${source.join("\n")}`,
);
