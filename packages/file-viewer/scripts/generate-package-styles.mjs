import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(packageDir, "tailwind-source.css");
const runtimePath = join(packageDir, "styles.runtime.css");
const outputPath = join(packageDir, "styles.css");

const source = await readFile(sourcePath, "utf8");
const compiler = await compile(
  [
    '@import "tailwindcss/theme.css" layer(theme);',
    '@import "tailwindcss/utilities.css" layer(utilities);',
    source,
  ].join("\n"),
  {
    base: packageDir,
    from: sourcePath,
    onDependency() {},
  },
);

const scanner = new Scanner({ sources: compiler.sources });
const utilityCss = compiler.build(scanner.scan());
const runtimeCss = await readFile(runtimePath, "utf8");

await writeFile(
  outputPath,
  `${utilityCss.trim()}\n\n${runtimeCss.trim()}\n`,
);
