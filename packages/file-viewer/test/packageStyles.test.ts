import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGE_DIR = resolve(import.meta.dirname, "..");

describe("package stylesheets", () => {
  it("ships compiled runtime styles and isolates the optional scan entry", () => {
    const runtimeStyles = readFileSync(resolve(PACKAGE_DIR, "styles.css"), "utf8");
    const tailwindSourceStyles = readFileSync(
      resolve(PACKAGE_DIR, "tailwind-source.css"),
      "utf8",
    );

    expect(runtimeStyles).toContain("@layer utilities");
    expect(runtimeStyles).toContain(".absolute");
    expect(runtimeStyles).not.toContain("@source");
    expect(tailwindSourceStyles).toContain("@source");
  });
});
