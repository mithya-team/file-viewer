import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { detectFileKind } from "../src/detect/detectFileKind";

const SAMPLE_PPTX = resolve(import.meta.dirname, "../../../sample-files/sample-5.pptx");

describe("PptxRenderer integration", () => {
  it("detects real sample pptx fixture as pptx", async () => {
    const bytes = readFileSync(SAMPLE_PPTX);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("pptx");
  });
});
