import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ImageRendererProps {
  blobUrl: string;
  fileName?: string;
  zoom: number;
}

export function ImageRenderer({ blobUrl, fileName, zoom }: ImageRendererProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPannable, setIsPannable] = useState(false);
  const dragStateRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });

  const updatePannable = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setIsPannable(false);
      return;
    }
    const canPan =
      container.scrollWidth > container.clientWidth ||
      container.scrollHeight > container.clientHeight;
    setIsPannable(canPan);
  }, []);

  const stopDragging = useCallback(() => {
    dragStateRef.current.pointerId = -1;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    updatePannable();
  }, [updatePannable, zoom, blobUrl]);

  useEffect(() => {
    stopDragging();
  }, [zoom, stopDragging]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPannable || event.button !== 0 || !containerRef.current) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: containerRef.current.scrollLeft,
      startScrollTop: containerRef.current.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !isDragging) return;
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;
    containerRef.current.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
    containerRef.current.scrollTop = dragStateRef.current.startScrollTop - deltaY;
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopDragging();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full w-full overflow-auto pb-4",
        isDragging && "select-none",
        isPannable && (isDragging ? "cursor-grabbing" : "cursor-grab"),
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
    >
      <div className="flex min-h-full min-w-full items-center justify-center">
        <img
          src={blobUrl}
          alt={
            fileName ??
            t("CONSOLE.DATASOURCES.FILE_VIEWER.RENDERERS.IMAGE_ALT_FALLBACK")
          }
          className="object-contain"
          draggable={false}
          style={{
            width: `${zoom}%`,
            maxWidth: "none",
            maxHeight: "none",
            height: "auto",
            flexShrink: 0,
            transition: isDragging ? "none" : "width 120ms ease-out",
          }}
        />
      </div>
    </div>
  );
}
