import { describe, expect, it } from "vitest";
import {
  clampImageZoom,
  MAX_IMAGE_ZOOM,
  zoomAfterImageClick,
} from "../src/image/imageZoom";

describe("imageZoom", () => {
  it("steps sequentially from 100 to 200", () => {
    expect(zoomAfterImageClick(100)).toBe(150);
    expect(zoomAfterImageClick(150)).toBe(175);
    expect(zoomAfterImageClick(175)).toBe(185);
    expect(zoomAfterImageClick(185)).toBe(195);
    expect(zoomAfterImageClick(195)).toBe(200);
  });

  it("is a no-op at max zoom", () => {
    expect(zoomAfterImageClick(200)).toBe(200);
  });

  it("clamps toolbar and setZoom bounds", () => {
    expect(clampImageZoom(250)).toBe(200);
    expect(clampImageZoom(10)).toBe(40);
    expect(clampImageZoom(100)).toBe(100);
  });
});
