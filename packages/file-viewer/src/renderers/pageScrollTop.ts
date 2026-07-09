/** Cumulative scroll offset so page `targetPage` aligns at the scroll root top. */
export function getPageScrollTopFromSizes(
  targetPage: number,
  pageSizes: ReadonlyMap<number, { h: number }>,
  scale: number,
  pageGap: number,
  placeholderHeight = 0,
): number | null {
  const clamped = Math.max(1, targetPage);
  let top = 0;
  for (let pageNum = 1; pageNum < clamped; pageNum += 1) {
    const size = pageSizes.get(pageNum);
    if (size == null) {
      if (placeholderHeight <= 0) return null;
      top += placeholderHeight + pageGap;
      continue;
    }
    top += size.h * scale + pageGap;
  }
  return top;
}

export function isScrollOffsetNear(current: number, target: number, epsilon = 2): boolean {
  return Math.abs(current - target) <= epsilon;
}
