import UTIF from "../vendor/UTIF.js";
import type { UtifIfd } from "./utif.d";

export function decodeTiffIfdCount(buffer: ArrayBuffer): number {
  const ifds = UTIF.decode(buffer);
  if (ifds.length === 0) {
    throw new Error("TIFF contains no image directories.");
  }
  return ifds.length;
}

function rgbaToPngBlob(ifd: UtifIfd): Promise<Blob> {
  const width = ifd.width ?? 0;
  const height = ifd.height ?? 0;
  const rgba = UTIF.toRGBA8(ifd);
  if (width <= 0 || height <= 0 || rgba.length === 0) {
    throw new Error("Failed to decode TIFF page.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context == null) {
    throw new Error("Canvas is not available.");
  }
  const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
  context.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob == null) {
        reject(new Error("Failed to encode TIFF page as PNG."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function decodeTiffPageToPngBlob(
  buffer: ArrayBuffer,
  pageIndex: number,
): Promise<Blob> {
  const ifds = UTIF.decode(buffer);
  const ifdIndex = pageIndex - 1;
  if (ifdIndex < 0 || ifdIndex >= ifds.length) {
    throw new Error("TIFF page out of range.");
  }
  const ifd = ifds[ifdIndex]!;
  UTIF.decodeImage(buffer, ifd);
  return rgbaToPngBlob(ifd);
}
