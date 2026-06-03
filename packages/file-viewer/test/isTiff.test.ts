import { describe, expect, it } from "vitest";
import { isTiffBlob, isTiffDetection, isTiffMimeType } from "../src/image/isTiff";

describe("isTiff", () => {
  it("recognizes TIFF MIME types", () => {
    expect(isTiffMimeType("image/tiff")).toBe(true);
    expect(isTiffMimeType("image/tif")).toBe(true);
    expect(isTiffMimeType("image/png")).toBe(false);
  });

  it("detects TIFF from detection result", () => {
    expect(isTiffDetection({ kind: "image", mimeType: "image/tiff" })).toBe(true);
    expect(isTiffDetection({ kind: "image", mimeType: "image/png" })).toBe(false);
    expect(isTiffBlob({ kind: "image", mimeType: "image/tiff" })).toBe(true);
  });
});
