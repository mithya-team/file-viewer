import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGE_DIR = resolve(import.meta.dirname, "..");

describe("package stylesheets", () => {
  it("ships self-contained utilities scoped to the FileViewer root", () => {
    const runtimeStyles = readFileSync(resolve(PACKAGE_DIR, "styles.css"), "utf8");
    const tailwindSourceStyles = readFileSync(
      resolve(PACKAGE_DIR, "tailwind-source.css"),
      "utf8",
    );
    const bridgeStyles = readFileSync(
      resolve(PACKAGE_DIR, "tailwind-bridge.css"),
      "utf8",
    );
    const candidates = readFileSync(
      resolve(PACKAGE_DIR, "dist", "file-viewer-tailwind-content.html"),
      "utf8",
    );

    expect(runtimeStyles).toContain("@layer utilities");
    expect(runtimeStyles).toContain("[data-file-viewer-root] .absolute");
    expect(runtimeStyles).not.toContain("@source");
    expect(runtimeStyles).not.toMatch(/:root|:host|--tw-/);
    expect(runtimeStyles).not.toMatch(/^\s*\.container/m);
    expect(runtimeStyles).not.toMatch(/^\s*\.text-sm/m);
    expect(runtimeStyles).not.toMatch(/^\s*\.p-4/m);
    expect(tailwindSourceStyles).toContain('@import "./styles.css"');
    expect(bridgeStyles).toContain("[data-file-viewer-root]");
    expect(bridgeStyles).not.toMatch(/:root|:host|--font-mono:/);
    expect(candidates).toContain("Generated FileViewer utility candidates");
    expect(candidates).not.toContain("containerRef");
  });
});
