/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeTiffIfdCount, decodeTiffPageToPngBlob } from "../src/image/tiffDecode";
import { createMinimalTiffBuffer, createTwoPageTiffBuffer } from "./tiffTestFixtures";

describe("tiffDecode", () => {
  beforeEach(() => {
    globalThis.ImageData = class {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    } as unknown as typeof ImageData;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    HTMLCanvasElement.prototype.toBlob = function (
      callback: BlobCallback,
      type?: string,
    ) {
      callback(new Blob([new Uint8Array([137, 80, 78, 71])], { type: type ?? "image/png" }));
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("counts IFDs in a TIFF", () => {
    expect(decodeTiffIfdCount(createMinimalTiffBuffer())).toBe(1);
    expect(decodeTiffIfdCount(createTwoPageTiffBuffer())).toBe(2);
  });

  it("decodes a page to a PNG blob", async () => {
    const png = await decodeTiffPageToPngBlob(createMinimalTiffBuffer(), 1);
    expect(png.type).toBe("image/png");
    expect(png.size).toBeGreaterThan(0);
  });

  it("rejects out-of-range page index", async () => {
    await expect(decodeTiffPageToPngBlob(createMinimalTiffBuffer(), 2)).rejects.toThrow(
      /out of range/i,
    );
  });
});
