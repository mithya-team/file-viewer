import { useLayoutEffect, useRef } from "react";

export interface PptxSlideSlotProps {
  svg: string;
  className?: string;
}

export function PptxSlideSlot({ svg, className }: PptxSlideSlotProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host == null) return;
    host.replaceChildren();
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const root = doc.documentElement;
    if (root instanceof SVGSVGElement) {
      host.appendChild(document.importNode(root, true));
    }
  }, [svg]);

  return <div ref={hostRef} className={className} />;
}
