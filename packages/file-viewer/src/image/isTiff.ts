import type { DetectionResult } from "../types";

const TIFF_MIME_TYPES = new Set(["image/tiff", "image/tif"]);

export function isTiffMimeType(mimeType: string): boolean {
  return TIFF_MIME_TYPES.has(mimeType.toLowerCase());
}

export function isTiffDetection(detection: DetectionResult): boolean {
  return detection.kind === "image" && isTiffMimeType(detection.mimeType);
}

export function isTiffBlob(detection: DetectionResult): boolean {
  return isTiffDetection(detection);
}
