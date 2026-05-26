import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { DEFAULT_IMAGE_ZOOM } from "../image/imageZoom";
import { RENDERER_VIEWPORT_CLASS } from "./rendererViewport";

const PAN_THRESHOLD_PX = 5;
const DOUBLE_CLICK_MS = 300;

export interface ImageRendererProps {
  objectUrl: string;
  zoom: number;
  onError: (error: Error) => void;
  onStepZoom: () => void;
  onResetZoom: () => void;
}

export function ImageRenderer({
  objectUrl,
  zoom,
  onError,
  onStepZoom,
  onResetZoom,
}: ImageRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canPan, setCanPan] = useState(false);
  const dragStateRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
    didPan: false,
  });
  const lastPointerUpAtRef = useRef(0);

  const updateCanPan = useCallback(() => {
    const container = containerRef.current;
    if (container == null || zoom <= DEFAULT_IMAGE_ZOOM) {
      setCanPan(false);
      return;
    }
    setCanPan(
      container.scrollWidth > container.clientWidth + 1 ||
        container.scrollHeight > container.clientHeight + 1,
    );
  }, [zoom]);

  const stopDragging = useCallback(() => {
    dragStateRef.current.pointerId = -1;
    dragStateRef.current.didPan = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    updateCanPan();
  }, [updateCanPan, objectUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (container == null) return;
    const observer = new ResizeObserver(() => {
      updateCanPan();
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [updateCanPan]);

  useEffect(() => {
    stopDragging();
  }, [zoom, objectUrl, stopDragging]);

  const handleImagePointerDown = (event: PointerEvent<HTMLImageElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const container = containerRef.current;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: container?.scrollLeft ?? 0,
      startScrollTop: container?.scrollTop ?? 0,
      didPan: false,
    };
    if (canPan) {
      setIsDragging(true);
    }
  };

  const handleImagePointerMove = (event: PointerEvent<HTMLImageElement>) => {
    if (!canPan || containerRef.current == null) return;
    if (dragStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;
    if (
      !dragStateRef.current.didPan &&
      (Math.abs(deltaX) > PAN_THRESHOLD_PX || Math.abs(deltaY) > PAN_THRESHOLD_PX)
    ) {
      dragStateRef.current.didPan = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (!dragStateRef.current.didPan) return;

    containerRef.current.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
    containerRef.current.scrollTop = dragStateRef.current.startScrollTop - deltaY;
  };

  const handleImagePointerUp = (event: PointerEvent<HTMLImageElement>) => {
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const didPan = dragStateRef.current.didPan;
    stopDragging();

    if (didPan) return;

    const now = Date.now();
    if (now - lastPointerUpAtRef.current <= DOUBLE_CLICK_MS) {
      lastPointerUpAtRef.current = 0;
      onResetZoom();
      return;
    }

    lastPointerUpAtRef.current = now;
    onStepZoom();
  };

  const handleImagePointerCancel = (event: PointerEvent<HTMLImageElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopDragging();
  };

  const isFitZoom = zoom <= DEFAULT_IMAGE_ZOOM;

  return (
    <div
      ref={containerRef}
      className={`${RENDERER_VIEWPORT_CLASS} h-full w-full overflow-auto bg-(--file-viewer-surface-muted,#f8fafc) pb-4`}
    >
      <div className="flex min-h-full min-w-full items-center justify-center p-4">
        <img
          src={objectUrl}
          alt="Rendered file"
          draggable={false}
          className={`rounded [box-shadow:var(--file-viewer-shadow,0_1px_2px_rgb(15_23_42/0.08))] ${isDragging ? "select-none" : ""} ${
            canPan
              ? isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-zoom-in"
          } ${isFitZoom ? "max-h-full max-w-full object-contain" : "object-contain"}`}
          style={
            isFitZoom
              ? undefined
              : {
                  width: `${zoom}%`,
                  maxWidth: "none",
                  maxHeight: "none",
                  height: "auto",
                  flexShrink: 0,
                  transition: isDragging ? "none" : "width 120ms ease-out",
                }
          }
          onPointerDown={handleImagePointerDown}
          onPointerMove={handleImagePointerMove}
          onPointerUp={handleImagePointerUp}
          onPointerCancel={handleImagePointerCancel}
          onLostPointerCapture={handleImagePointerCancel}
          onError={() => onError(new Error("Failed to render image."))}
        />
      </div>
    </div>
  );
}
