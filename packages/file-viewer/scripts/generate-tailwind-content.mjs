import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(packageDir, "src");
const outputPath = join(packageDir, "dist", "file-viewer-tailwind-content.html");
const sourceExtensions = new Set([".ts", ".tsx"]);

function collectStringLiterals(node, values) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    values.add(node.text);
    return;
  }
  if (ts.isTemplateExpression(node)) {
    values.add(node.head.text);
    for (const span of node.templateSpans) {
      collectStringLiterals(span.expression, values);
      values.add(span.literal.text);
    }
    return;
  }
  ts.forEachChild(node, (child) => collectStringLiterals(child, values));
}

function collectClassValues(source, fileName) {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const values = new Set();

  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.text === "className" && node.initializer != null) {
      collectStringLiterals(node.initializer, values);
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      /class$/i.test(node.name.text) &&
      node.initializer != null
    ) {
      collectStringLiterals(node.initializer, values);
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  return values;
}

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
const source = await Promise.all(
  sourceFiles.map(async (path) => ({ path, source: await readFile(path, "utf8") })),
);
const candidates = new Set(source.flatMap(({ path, source }) => [...collectClassValues(source, path)]));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `<!-- Generated FileViewer utility candidates. Do not add source files or fixtures here. -->\n${[...candidates].sort().join("\n")}`,
);
