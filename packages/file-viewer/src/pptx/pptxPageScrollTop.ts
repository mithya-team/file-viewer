/** Matches `min-h-24` on idle PPTX slide slots. */
export const PPTX_SLOT_PLACEHOLDER_HEIGHT_PX = 96;

export type PptxSlideHeightSource =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; height: number }
  | { status: "error" };

export function getPptxSlideBlockHeight(
  state: PptxSlideHeightSource | undefined,
  scale: number,
): number {
  if (state?.status === "ready") {
    return state.height * scale;
  }
  return PPTX_SLOT_PLACEHOLDER_HEIGHT_PX;
}

/** Scroll offset using synchronously-populated slide cache (preferred for navigation). */
export function getPptxPageScrollTopFromSlideCache(
  targetPage: number,
  slideCache: ReadonlyMap<number, { height: number }>,
  fallbackStateByPage: ReadonlyMap<number, PptxSlideHeightSource>,
  scale: number,
  pageGap: number,
): number {
  const heightSources = new Map<number, PptxSlideHeightSource>();
  for (let pageNum = 1; pageNum < targetPage; pageNum += 1) {
    const cached = slideCache.get(pageNum);
    if (cached != null) {
      heightSources.set(pageNum, { status: "ready", height: cached.height });
      continue;
    }
    heightSources.set(pageNum, fallbackStateByPage.get(pageNum) ?? { status: "idle" });
  }
  return getPptxPageScrollTop(targetPage, heightSources, scale, pageGap);
}

/** Scroll offset that aligns the top of `page` with the scroll container top. */
export function getPptxPageScrollTop(
  page: number,
  slideStateByPage: ReadonlyMap<number, PptxSlideHeightSource>,
  scale: number,
  pageGap: number,
): number {
  const targetPage = Math.max(1, page);
  let top = 0;
  for (let pageNum = 1; pageNum < targetPage; pageNum += 1) {
    top += getPptxSlideBlockHeight(slideStateByPage.get(pageNum), scale) + pageGap;
  }
  return top;
}
