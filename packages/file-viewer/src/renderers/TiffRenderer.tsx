import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_IMAGE_ZOOM } from "../image/imageZoom";
import { decodeTiffPageToPngBlob } from "../image/tiffDecode";
import type { UtifIfd } from "../image/utif";
import UTIF from "../vendor/UTIF.js";
import { ViewerStatus } from "../primitives/ViewerStatus";
import { PAGE_GAP } from "./pdf/constants";
import { PDF_PAGE_COLUMN_CLASS, PDF_PAGE_SLOT_CLASS, PDF_SCROLL_ROOT_CLASS } from "./pdf/textLayerTailwind";
import { getPageScrollTopFromSizes } from "./pageScrollTop";
import { RENDERER_VIEWPORT_CENTERED_CLASS } from "./rendererViewport";
import { usePaginatedScrollStack } from "./usePaginatedScrollStack";

export interface TiffRendererProps {
  blob: Blob;
  page: number;
  zoom: number;
  onError: (error: Error) => void;
  onPageCountChange: (pageCount: number) => void;
  onVisiblePageChange?: (page: number) => void;
  onProgrammaticPageNavigateSettled?: (page: number) => void;
}

type PageSlotState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; objectUrl: string }
  | { status: "error"; message: string };

function normalizeRenderError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("Failed to render TIFF.");
}

function readIfdSize(ifd: UtifIfd): { w: number; h: number } {
  const widthTag = ifd.t256;
  const heightTag = ifd.t257;
  const w = ifd.width ?? (Array.isArray(widthTag) ? Number(widthTag[0]) : 0);
  const h = ifd.height ?? (Array.isArray(heightTag) ? Number(heightTag[0]) : 0);
  return {
    w: w > 0 ? w : 400,
    h: h > 0 ? h : 400,
  };
}

function revokeDisplayUrls(urls: Map<number, string>) {
  urls.forEach((url) => URL.revokeObjectURL(url));
  urls.clear();
}

export function TiffRenderer({
  blob,
  page,
  zoom,
  onError,
  onPageCountChange,
  onVisiblePageChange,
  onProgrammaticPageNavigateSettled,
}: TiffRendererProps) {
  const bufferRef = useRef<ArrayBuffer | null>(null);
  const ifdsRef = useRef<UtifIfd[]>([]);
  const displayUrlsRef = useRef<Map<number, string>>(new Map());
  const decodingRef = useRef<Set<number>>(new Set());
  const decodePageRef = useRef<(pageNum: number) => void>(() => {});

  const onErrorRef = useRef(onError);
  const onPageCountChangeRef = useRef(onPageCountChange);
  onErrorRef.current = onError;
  onPageCountChangeRef.current = onPageCountChange;

  const [numPages, setNumPages] = useState(0);
  const [pageSizes, setPageSizes] = useState<Map<number, { w: number; h: number }>>(new Map());
  const [slotState, setSlotState] = useState<Map<number, PageSlotState>>(new Map());
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);

  const isFitZoom = zoom <= DEFAULT_IMAGE_ZOOM;
  const scale = zoom / 100;

  const getPageScrollTop = useCallback(
    (targetPage: number) =>
      getPageScrollTopFromSizes(targetPage, pageSizes, scale, PAGE_GAP, 96),
    [pageSizes, scale],
  );

  const { scrollRef } = usePaginatedScrollStack({
    numPages,
    isDocumentLoading,
    page,
    layoutKey: zoom,
    onVisiblePageChange,
    onPageNearViewport: (pageNum) => {
      void decodePageRef.current(pageNum);
    },
    getPageScrollTop,
    onProgrammaticPageNavigateSettled,
  });

  const decodePage = useCallback(
    async (pageNum: number) => {
      const buffer = bufferRef.current;
      if (buffer == null || decodingRef.current.has(pageNum)) return;

      const cached = displayUrlsRef.current.get(pageNum);
      if (cached != null) {
        setSlotState((prev) => {
          const next = new Map(prev);
          next.set(pageNum, { status: "ready", objectUrl: cached });
          return next;
        });
        return;
      }

      decodingRef.current.add(pageNum);
      setSlotState((prev) => {
        const next = new Map(prev);
        next.set(pageNum, { status: "loading" });
        return next;
      });

      try {
        const pngBlob = await decodeTiffPageToPngBlob(buffer, pageNum);
        const objectUrl = URL.createObjectURL(pngBlob);
        displayUrlsRef.current.set(pageNum, objectUrl);
        setSlotState((prev) => {
          const next = new Map(prev);
          next.set(pageNum, { status: "ready", objectUrl });
          return next;
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to decode TIFF page.";
        setSlotState((prev) => {
          const next = new Map(prev);
          next.set(pageNum, { status: "error", message });
          return next;
        });
      } finally {
        decodingRef.current.delete(pageNum);
      }
    },
    [],
  );

  decodePageRef.current = (pageNum) => {
    void decodePage(pageNum);
  };

  useEffect(() => {
    let active = true;
    setIsDocumentLoading(true);
    setNumPages(0);
    setPageSizes(new Map());
    setSlotState(new Map());
    revokeDisplayUrls(displayUrlsRef.current);
    decodingRef.current.clear();
    bufferRef.current = null;
    ifdsRef.current = [];

    void blob
      .arrayBuffer()
      .then((buffer) => {
        if (!active) return;
        let ifds: UtifIfd[];
        try {
          ifds = UTIF.decode(buffer);
        } catch (error) {
          onErrorRef.current(normalizeRenderError(error));
          return;
        }
        if (ifds.length === 0) {
          onErrorRef.current(new Error("TIFF contains no image directories."));
          return;
        }
        bufferRef.current = buffer;
        ifdsRef.current = ifds;
        const sizes = new Map<number, { w: number; h: number }>();
        for (let index = 0; index < ifds.length; index += 1) {
          sizes.set(index + 1, readIfdSize(ifds[index]!));
        }
        setPageSizes(sizes);
        setNumPages(ifds.length);
        onPageCountChangeRef.current(ifds.length);
        setIsDocumentLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        onErrorRef.current(normalizeRenderError(error));
      });

    return () => {
      active = false;
      revokeDisplayUrls(displayUrlsRef.current);
      decodingRef.current.clear();
    };
  }, [blob]);

  if (isDocumentLoading) {
    return (
      <div className={RENDERER_VIEWPORT_CENTERED_CLASS}>
        <ViewerStatus>Loading TIFF...</ViewerStatus>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={PDF_SCROLL_ROOT_CLASS}>
      <div
        className={PDF_PAGE_COLUMN_CLASS}
        style={{ gap: `var(--file-viewer-page-gap, ${PAGE_GAP}px)` }}
      >
        {Array.from({ length: numPages }, (_, index) => {
          const pageNum = index + 1;
          const size = pageSizes.get(pageNum);
          const scaledW = size ? size.w * scale : undefined;
          const scaledH = size ? size.h * scale : undefined;
          const state = slotState.get(pageNum) ?? { status: "idle" };

          return (
            <div
              key={pageNum}
              data-page-num={pageNum}
              className={`${PDF_PAGE_SLOT_CLASS} flex min-h-24 items-center justify-center`}
              style={{
                width: scaledW,
                minHeight: scaledH,
              }}
            >
              {state.status === "loading" && (
                <ViewerStatus>Loading page {pageNum}...</ViewerStatus>
              )}
              {state.status === "error" && (
                <ViewerStatus tone="error">{state.message}</ViewerStatus>
              )}
              {state.status === "ready" && (
                <img
                  src={state.objectUrl}
                  alt={`TIFF page ${pageNum}`}
                  draggable={false}
                  className={`block max-w-none object-contain ${isFitZoom ? "h-auto w-full" : ""}`}
                  style={
                    isFitZoom
                      ? undefined
                      : {
                          width: `${zoom}%`,
                          maxWidth: "none",
                          height: "auto",
                        }
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
