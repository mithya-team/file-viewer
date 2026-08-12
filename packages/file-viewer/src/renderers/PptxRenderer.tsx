import {
  ReactPptxViewer,
  type PptxViewerController,
  type PptxViewerError,
  type PresentationWarning,
} from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";
import { useEffect, useRef, useState } from "react";
import { ViewerStatus } from "../primitives/ViewerStatus";
import { PDF_SCROLL_ROOT_CLASS } from "./pdf/textLayerTailwind";
import { RENDERER_VIEWPORT_CENTERED_CLASS } from "./rendererViewport";

export interface PptxRendererProps {
  blob: Blob;
  page: number;
  navIntent?: number;
  zoom: number;
  onError: (error: Error) => void;
  onPageCountChange: (pageCount: number) => void;
  onGeometryReadyChange?: (ready: boolean) => void;
  onVisiblePageChange?: (page: number) => void;
  onProgrammaticPageNavigateSettled?: (page: number) => void;
}

function normalizeRenderError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("Failed to render PPTX.");
}

function warningToError(warning: PresentationWarning): Error | null {
  return warning.severity === "error" ? new Error(warning.message) : null;
}

/** Internal PPTX adapter. Extend owns parsing, slide DOM, and virtualization. */
export function PptxRenderer({
  blob,
  page,
  navIntent = 0,
  zoom,
  onError,
  onPageCountChange,
  onGeometryReadyChange,
  onVisiblePageChange,
  onProgrammaticPageNavigateSettled,
}: PptxRendererProps) {
  const controllerRef = useRef<PptxViewerController | null>(null);
  const loadedBlobRef = useRef<Blob | null>(null);
  const lastIntentRef = useRef(navIntent);
  const pendingNavigationRef = useRef<{
    intent: number;
    page: number;
  } | null>(null);
  const [controllerReady, setControllerReady] = useState(false);
  const [presentationLoaded, setPresentationLoaded] = useState(false);
  const onErrorRef = useRef(onError);
  const onPageCountChangeRef = useRef(onPageCountChange);
  const onGeometryReadyChangeRef = useRef(onGeometryReadyChange);
  const onVisiblePageChangeRef = useRef(onVisiblePageChange);
  const onProgrammaticPageNavigateSettledRef = useRef(
    onProgrammaticPageNavigateSettled,
  );

  onErrorRef.current = onError;
  onPageCountChangeRef.current = onPageCountChange;
  onGeometryReadyChangeRef.current = onGeometryReadyChange;
  onVisiblePageChangeRef.current = onVisiblePageChange;
  onProgrammaticPageNavigateSettledRef.current =
    onProgrammaticPageNavigateSettled;

  useEffect(() => {
    if (loadedBlobRef.current === blob) return;
    loadedBlobRef.current = blob;
    controllerRef.current = null;
    setControllerReady(false);
    setPresentationLoaded(false);
    pendingNavigationRef.current = null;
    lastIntentRef.current = navIntent;
    onGeometryReadyChangeRef.current?.(false);
  }, [blob]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller == null || !controllerReady) return;
    void controller.setZoom(zoom).catch((error) => {
      onErrorRef.current(normalizeRenderError(error));
    });
  }, [controllerReady, zoom]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller == null || !controllerReady || !presentationLoaded) return;
    if (navIntent === lastIntentRef.current) return;
    lastIntentRef.current = navIntent;
    const targetPage = Math.max(1, page);
    pendingNavigationRef.current = { intent: navIntent, page: targetPage };
    void controller
      .goToSlide(targetPage - 1, { behavior: "smooth", block: "start" })
      .then(() => {
        const pending = pendingNavigationRef.current;
        if (pending?.intent !== navIntent) return;
        if (controller.getSlideIndex() + 1 !== targetPage) return;
        pendingNavigationRef.current = null;
        onProgrammaticPageNavigateSettledRef.current?.(targetPage);
      })
      .catch((error) => {
        const pending = pendingNavigationRef.current;
        if (pending?.intent === navIntent) {
          pendingNavigationRef.current = null;
          onErrorRef.current(normalizeRenderError(error));
        }
      });
  }, [controllerReady, navIntent, page, presentationLoaded]);

  const handleReady = (controller: PptxViewerController) => {
    controllerRef.current = controller;
    setControllerReady(true);
    onGeometryReadyChangeRef.current?.(true);
    // A command may have arrived while the presentation was parsing. Reset the
    // observed token so the effect executes it once `onLoad` has completed.
    lastIntentRef.current = navIntent - 1;
  };

  const handleLoad = (presentation: { document: { slides: unknown[] } }) => {
    const pageCount = presentation.document.slides.length;
    if (pageCount < 1) {
      onErrorRef.current(new Error("Presentation has no slides."));
      return;
    }
    setPresentationLoaded(true);
    onPageCountChangeRef.current(pageCount);
    onGeometryReadyChangeRef.current?.(true);
  };

  const handleSlideChange = (index: number) => {
    const visiblePage = index + 1;
    onVisiblePageChangeRef.current?.(visiblePage);
    const pending = pendingNavigationRef.current;
    if (pending?.page === visiblePage) {
      pendingNavigationRef.current = null;
      onProgrammaticPageNavigateSettledRef.current?.(visiblePage);
    }
  };

  const handleError = (error: PptxViewerError) => {
    onGeometryReadyChangeRef.current?.(false);
    onErrorRef.current(normalizeRenderError(error));
  };

  const handleWarning = (warning: PresentationWarning) => {
    const error = warningToError(warning);
    if (error != null) onErrorRef.current(error);
  };

  return (
    <div className={PDF_SCROLL_ROOT_CLASS}>
      <ReactPptxViewer
        source={blob}
        slideIndex={Math.max(0, page - 1)}
        mode="continuous"
        zoom={zoom}
        showToolbar={false}
        showThumbnails={false}
        showNotes={false}
        showDiagnostics={false}
        virtualization={{ enabled: true, overscanViewport: 2 }}
        onReady={handleReady}
        onLoad={handleLoad}
        onError={handleError}
        onWarning={handleWarning}
        onSlideChange={handleSlideChange}
        renderLoading={() => (
          <div className={RENDERER_VIEWPORT_CENTERED_CLASS}>
            <ViewerStatus>Loading presentation...</ViewerStatus>
          </div>
        )}
        renderError={(error) => (
          <div className={RENDERER_VIEWPORT_CENTERED_CLASS}>
            <ViewerStatus tone="error">{error.message}</ViewerStatus>
          </div>
        )}
      />
    </div>
  );
}
