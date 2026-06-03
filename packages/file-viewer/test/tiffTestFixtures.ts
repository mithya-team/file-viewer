if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis as unknown as Window & typeof globalThis;
}

import UTIF from "../src/vendor/UTIF.js";

/** Minimal 1×1 white RGBA TIFF (classic little-endian). */
export function createMinimalTiffBuffer(): ArrayBuffer {
  const rgba = new Uint8Array([255, 255, 255, 255]);
  return UTIF.encodeImage(rgba, 1, 1);
}

/** Two-page TIFF for multi-page tests. */
export function createTwoPageTiffBuffer(): ArrayBuffer {
  const page1 = UTIF.encodeImage(new Uint8Array([255, 0, 0, 255]), 1, 1);
  const page2 = UTIF.encodeImage(new Uint8Array([0, 255, 0, 255]), 1, 1);
  const ifds1 = UTIF.decode(page1);
  const ifds2 = UTIF.decode(page2);
  return UTIF.encode([ifds1[0]!, ifds2[0]!]);
}
