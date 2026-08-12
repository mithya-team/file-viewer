import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(packageDir, "tailwind-source.css");
const runtimePath = join(packageDir, "styles.runtime.css");
const outputPath = join(packageDir, "styles.css");
const rootSelector = "[data-file-viewer-root]";

function scopeUtilitySelectors(css) {
  const scopedCss = css.replace(/^(\s*)(\.[^{\n]+) \{$/gm, (_, indent, selector) => {
    // Tailwind escapes commas inside arbitrary-value class selectors. Every
    // generated top-level utility rule is a single selector, so do not split
    // on commas here or those escaped class names become invalid CSS.
    return `${indent}${rootSelector}${selector},\n${indent}${rootSelector} ${selector} {`;
  });

  return scopedCss.replace(
    /^(\s*)\*, ::before, ::after, ::backdrop \{$/gm,
    `$1${rootSelector}, ${rootSelector} *, ${rootSelector}::before, ${rootSelector} *::before, ${rootSelector}::after, ${rootSelector} *::after, ${rootSelector}::backdrop, ${rootSelector} *::backdrop {`,
  );
}

function removeTailwindPropertyOutput(css) {
  function removeBlock(source, marker) {
    const start = source.indexOf(marker);
    if (start === -1) return source;
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      if (depth === 0) return `${source.slice(0, start)}${source.slice(index + 1)}`;
    }
    throw new Error(`Unable to remove Tailwind CSS block: ${marker}`);
  }

  let result = css;
  while (result.includes("@property --tw-")) result = removeBlock(result, "@property --tw-");
  while (result.includes("@layer properties {")) {
    result = removeBlock(result, "@layer properties {");
  }
  return result.replaceAll("var(--tw-border-style)", "var(--tw-border-style, solid)");
}

const candidateSource = '@source "./dist/file-viewer-tailwind-content.html";';
const compiler = await compile(
  [
    '@import "tailwindcss/utilities.css" layer(utilities);',
    '@theme inline {',
    '  --font-mono: var(--file-viewer-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);',
    '  --color-white: var(--file-viewer-color-white, #fff);',
    '  --spacing: var(--file-viewer-spacing, 0.25rem);',
    '  --text-xs: var(--file-viewer-text-xs, 0.75rem);',
    '  --text-xs--line-height: var(--file-viewer-text-xs-line-height, calc(1 / 0.75));',
    '  --text-sm: var(--file-viewer-text-sm, 0.875rem);',
    '  --text-sm--line-height: var(--file-viewer-text-sm-line-height, calc(1.25 / 0.875));',
    '  --text-lg: var(--file-viewer-text-lg, 1.125rem);',
    '  --text-lg--line-height: var(--file-viewer-text-lg-line-height, calc(1.75 / 1.125));',
    '  --text-xl: var(--file-viewer-text-xl, 1.25rem);',
    '  --text-xl--line-height: var(--file-viewer-text-xl-line-height, calc(1.75 / 1.25));',
    '  --text-2xl: var(--file-viewer-text-2xl, 1.5rem);',
    '  --text-2xl--line-height: var(--file-viewer-text-2xl-line-height, calc(2 / 1.5));',
    '  --font-weight-semibold: var(--file-viewer-font-weight-semibold, 600);',
    '  --leading-relaxed: var(--file-viewer-leading-relaxed, 1.625);',
    '  --ease-out: var(--file-viewer-ease-out, cubic-bezier(0, 0, 0.2, 1));',
    '  --default-transition-duration: var(--file-viewer-transition-duration, 150ms);',
    '  --default-transition-timing-function: var(--file-viewer-transition-timing-function, cubic-bezier(0.4, 0, 0.2, 1));',
    '}',
    candidateSource,
  ].join("\n"),
  {
    base: packageDir,
    from: sourcePath,
    onDependency() {},
  },
);

const scanner = new Scanner({ sources: compiler.sources });
const utilityCss = scopeUtilitySelectors(
  removeTailwindPropertyOutput(compiler.build(scanner.scan())),
).replaceAll("--tw-", "--file-viewer-tw-");
const runtimeCss = await readFile(runtimePath, "utf8");

await writeFile(
  outputPath,
  `${utilityCss.trim()}\n\n${runtimeCss.trim()}\n`,
);
