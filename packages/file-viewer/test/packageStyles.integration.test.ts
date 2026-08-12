import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGE_DIR = resolve(import.meta.dirname, "..");
const hostTheme = `
@theme {
  --font-mono: "Host Mono";
  --text-sm: 19px;
  --text-sm--line-height: 31px;
  --text-xl: 37px;
  --spacing: 7px;
}
@source inline("container text-sm text-xl p-4 max-w-none");
`;

async function compileTailwindHost(packageFirst: boolean) {
  const stylesheet = packageFirst
    ? `@import "./styles.css"; @import "tailwindcss"; ${hostTheme}`
    : `@import "tailwindcss"; @import "./styles.css"; ${hostTheme}`;
  const compiler = await compile(stylesheet, {
    base: PACKAGE_DIR,
    from: resolve(PACKAGE_DIR, "host-fixture.css"),
    onDependency() {},
  });
  const scanner = new Scanner({ sources: compiler.sources });
  return compiler.build(scanner.scan());
}

describe("Tailwind v4 host stylesheet integration", () => {
  it.each([true, false])("preserves host utilities when packageFirst=%s", async (packageFirst) => {
    const css = await compileTailwindHost(packageFirst);

    expect(css).toContain('--font-mono: "Host Mono"');
    expect(css).toContain("--text-sm: 19px");
    expect(css).toContain("--text-xl: 37px");
    expect(css).toContain("--spacing: 7px");
    expect(css).toMatch(/^  \.container \{/m);
    expect(css).toMatch(/^  \.text-sm \{/m);
    expect(css).toMatch(/^  \.p-4 \{/m);
    expect(css).toContain("[data-file-viewer-root] .text-sm");
    expect(css).not.toContain("--font-mono: ui-monospace");
  });
});
