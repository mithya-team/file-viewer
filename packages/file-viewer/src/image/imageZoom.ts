export const MIN_IMAGE_ZOOM = 40;
export const MAX_IMAGE_ZOOM = 200;
export const DEFAULT_IMAGE_ZOOM = 100;
export const IMAGE_ZOOM_TOOLBAR_STEP = 10;

export function clampImageZoom(zoom: number): number {
  return Math.min(Math.max(zoom, MIN_IMAGE_ZOOM), MAX_IMAGE_ZOOM);
}

export function zoomAfterImageClick(current: number): number {
  if (current >= MAX_IMAGE_ZOOM) return MAX_IMAGE_ZOOM;
  if (current < 150) return Math.min(current + 50, MAX_IMAGE_ZOOM);
  if (current < 175) return Math.min(current + 25, MAX_IMAGE_ZOOM);
  return Math.min(current + 10, MAX_IMAGE_ZOOM);
}
