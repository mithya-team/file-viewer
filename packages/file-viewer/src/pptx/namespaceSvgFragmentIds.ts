/**
 * Pagus resets def IDs (e.g. pagus_1) per slide. In a multi-slide scroll stack,
 * url(#pagus_1) resolves to the first matching id in the document — wrong clips.
 */
export function namespaceSvgFragmentIds(svg: string, namespace: string): string {
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]!);
  const uniqueIds = [...new Set(ids)].sort((left, right) => right.length - left.length);

  let result = svg;
  for (const id of uniqueIds) {
    const prefixed = `${namespace}__${id}`;
    result = result.replaceAll(`id="${id}"`, `id="${prefixed}"`);
    result = result.replaceAll(`url(#${id})`, `url(#${prefixed})`);
    result = result.replaceAll(`href="#${id}"`, `href="#${prefixed}"`);
    result = result.replaceAll(`xlink:href="#${id}"`, `xlink:href="#${prefixed}"`);
  }
  return result;
}
