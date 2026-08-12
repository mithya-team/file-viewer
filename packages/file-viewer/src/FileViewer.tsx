import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { detectFileKind } from "./detect/detectFileKind";
import { FileViewerDefaultChrome } from "./FileViewerDefaultChrome";
import { isTiffDetection } from "./image/isTiff";
import { ViewerStatus } from "./primitives/ViewerStatus";
import { DocxRenderer } from "./renderers/DocxRenderer";
import { ImageRenderer } from "./renderers/ImageRenderer";
import { PptxRenderer } from "./renderers/PptxRenderer";
import { PdfRenderer } from "./renderers/PdfRenderer";
import { TiffRenderer } from "./renderers/TiffRenderer";
import { SpreadsheetRenderer } from "./renderers/SpreadsheetRenderer";
import { RENDERER_VIEWPORT_CENTERED_CLASS } from "./renderers/rendererViewport";
import { MarkdownRenderer } from "./renderers/MarkdownRenderer";
import { HtmlRenderer } from "./renderers/HtmlRenderer";
import { TextRenderer } from "./renderers/TextRenderer";
import {
  clampImageZoom,
  DEFAULT_IMAGE_ZOOM,
  IMAGE_ZOOM_TOOLBAR_STEP,
  zoomAfterImageClick,
} from "./image/imageZoom";
import { loadSourceToBlob } from "./source/loadSourceToBlob";
import type {
  ContentViewMode,
  DetectionResult,
  FileViewerChromeApi,
  FileViewerProps,
  PageNavigateListener,
} from "./types";

type ViewerState =
  | { status: "loading" }
  | { status: "ready"; blob: Blob; detection: DetectionResult }
  | { status: "unsupported"; error: Error; detection: DetectionResult & { kind: "unsupported" } }
  | { status: "error"; error: Error };

const MIN_PDF_ZOOM = 40;
const MAX_PDF_ZOOM = 300;

function sourceTypeOf(source: FileViewerProps["source"]): "string" | "blob" | "stream" {
  if (typeof source === "string") return "string";
  if (source instanceof Blob) return "blob";
  return "stream";
}

function setPageWithinBounds(page: number, pageCount: number) {
  if (pageCount < 1) return Math.max(1, page);
  return Math.min(Math.max(page, 1), pageCount);
}

async function resolveViewerState(source: FileViewerProps["source"], signal: AbortSignal) {
  const blob = await loadSourceToBlob(source, signal);
  const detection = await detectFileKind(blob);
  return { blob, detection };
}

function createSubscribePageNavigate(listeners: Set<PageNavigateListener>) {
  return (listener: PageNavigateListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
}

function emitPageNavigateSettled(
  listeners: Set<PageNavigateListener>,
  page: number,
) {
  const event = { page, reason: "programmatic" as const };
  listeners.forEach((listener) => {
    listener(event);
  });
}

function createChromeApi({
  detection,
  downloadUrl,
  enableHtmlPreview,
  viewMode,
  setViewMode,
  pdfPage,
  pdfPageCount,
  pdfGeometryReady,
  pdfZoom,
  imageZoom,
  imagePage,
  imagePageCount,
  imageGeometryReady,
  pptxPage,
  pptxPageCount,
  pptxGeometryReady,
  pptxZoom,
  sheetNames,
  activeSheetIndex,
  setActiveSheetIndex,
  setPdfPage,
  setPdfZoom,
  setImageZoom,
  setImagePage,
  setPptxPage,
  setPptxZoom,
  subscribePdfPageNavigate,
  subscribeImagePageNavigate,
  subscribePptxPageNavigate,
}: {
  detection: DetectionResult;
  downloadUrl: string | null;
  enableHtmlPreview: boolean;
  viewMode: ContentViewMode;
  setViewMode: (mode: ContentViewMode) => void;
  pdfPage: number;
  pdfPageCount: number;
  pdfGeometryReady: boolean;
  pdfZoom: number;
  imageZoom: number;
  imagePage: number;
  imagePageCount: number;
  imageGeometryReady: boolean;
  pptxPage: number;
  pptxPageCount: number;
  pptxGeometryReady: boolean;
  pptxZoom: number;
  sheetNames: string[];
  activeSheetIndex: number;
  setActiveSheetIndex: (index: number) => void;
  setPdfPage: (page: number) => void;
  setPdfZoom: (zoom: number) => void;
  setImageZoom: (zoom: number) => void;
  setImagePage: (page: number) => void;
  setPptxPage: (page: number) => void;
  setPptxZoom: (zoom: number) => void;
  subscribePdfPageNavigate: (listener: PageNavigateListener) => () => void;
  subscribeImagePageNavigate: (listener: PageNavigateListener) => () => void;
  subscribePptxPageNavigate: (listener: PageNavigateListener) => () => void;
}): FileViewerChromeApi {
  switch (detection.kind) {
    case "image":
      return {
        file: {
          kind: "image",
          mimeType: detection.mimeType,
          downloadUrl,
        },
        image: {
          zoom: imageZoom,
          zoomIn: () => setImageZoom(clampImageZoom(imageZoom + IMAGE_ZOOM_TOOLBAR_STEP)),
          zoomOut: () => setImageZoom(clampImageZoom(imageZoom - IMAGE_ZOOM_TOOLBAR_STEP)),
          setZoom: (zoom) => setImageZoom(clampImageZoom(zoom)),
          stepZoomIn: () => setImageZoom(zoomAfterImageClick(imageZoom)),
          resetZoom: () => setImageZoom(DEFAULT_IMAGE_ZOOM),
          page: imagePage,
          pageCount: imagePageCount,
          geometryReady: imageGeometryReady,
          canPrev: imagePage > 1,
          canNext: imagePage < imagePageCount,
          prevPage: () => setImagePage(imagePage - 1),
          nextPage: () => setImagePage(imagePage + 1),
          setPage: (page) => setImagePage(page),
          subscribePageNavigate: subscribeImagePageNavigate,
        },
      };
    case "pdf":
      return {
        file: {
          kind: "pdf",
          mimeType: detection.mimeType,
          downloadUrl,
        },
        pdf: {
          page: pdfPage,
          pageCount: pdfPageCount,
          geometryReady: pdfGeometryReady,
          zoom: pdfZoom,
          canPrev: pdfPage > 1,
          canNext: pdfPage < pdfPageCount,
          prevPage: () => setPdfPage(pdfPage - 1),
          nextPage: () => setPdfPage(pdfPage + 1),
          setPage: (page) => setPdfPage(page),
          subscribePageNavigate: subscribePdfPageNavigate,
          zoomIn: () => setPdfZoom(pdfZoom + 10),
          zoomOut: () => setPdfZoom(pdfZoom - 10),
          setZoom: (zoom) => setPdfZoom(zoom),
        },
      };
    case "spreadsheet":
      return {
        file: {
          kind: "spreadsheet",
          mimeType: detection.mimeType,
          downloadUrl,
        },
        spreadsheet:
          detection.mimeType === "text/csv"
            ? {}
            : {
                sheetNames,
                activeSheetIndex,
                setActiveSheetIndex,
              },
      };
    case "docx":
      return {
        file: {
          kind: "docx",
          mimeType: detection.mimeType,
          downloadUrl,
        },
      };
    case "pptx":
      return {
        file: {
          kind: "pptx",
          mimeType: detection.mimeType,
          downloadUrl,
        },
        pptx: {
          page: pptxPage,
          pageCount: pptxPageCount,
          geometryReady: pptxGeometryReady,
          zoom: pptxZoom,
          canPrev: pptxPage > 1,
          canNext: pptxPage < pptxPageCount,
          prevPage: () => setPptxPage(pptxPage - 1),
          nextPage: () => setPptxPage(pptxPage + 1),
          setPage: (page) => setPptxPage(page),
          subscribePageNavigate: subscribePptxPageNavigate,
          zoomIn: () => setPptxZoom(pptxZoom + 10),
          zoomOut: () => setPptxZoom(pptxZoom - 10),
          setZoom: (zoom) => setPptxZoom(zoom),
        },
      };
    case "text":
      return {
        file: {
          kind: "text",
          mimeType: detection.mimeType,
          downloadUrl,
        },
      };
    case "markdown":
      return {
        file: {
          kind: "markdown",
          mimeType: detection.mimeType,
          downloadUrl,
        },
        markdown: {
          viewMode,
          setViewMode,
        },
      };
    case "html":
      return {
        file: {
          kind: "html",
          mimeType: detection.mimeType,
          downloadUrl,
        },
        ...(enableHtmlPreview
          ? {
              html: {
                viewMode,
                setViewMode,
              },
            }
          : {}),
      };
    case "unsupported":
      return {
        file: {
          kind: "unsupported",
          mimeType: detection.mimeType,
          downloadUrl,
        },
      };
  }

  const exhaustiveCheck: never = detection;
  return exhaustiveCheck;
}

export function FileViewer({
  source,
  className,
  chrome = "default",
  enableHtmlPreview = false,
  renderFallback,
  onError,
}: FileViewerProps) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfNavIntent, setPdfNavIntent] = useState(0);
  const [pdfGeometryReady, setPdfGeometryReady] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [imageZoom, setImageZoom] = useState(DEFAULT_IMAGE_ZOOM);
  const [imagePage, setImagePage] = useState(1);
  const [imagePageCount, setImagePageCount] = useState(0);
  const [imageNavIntent, setImageNavIntent] = useState(0);
  const [imageGeometryReady, setImageGeometryReady] = useState(false);
  const [pptxPage, setPptxPage] = useState(1);
  const [pptxPageCount, setPptxPageCount] = useState(0);
  const [pptxNavIntent, setPptxNavIntent] = useState(0);
  const [pptxGeometryReady, setPptxGeometryReady] = useState(false);
  const [pptxZoom, setPptxZoom] = useState(100);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ContentViewMode>("preview");
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const pdfPendingPageRef = useRef<number | null>(null);
  const imagePendingPageRef = useRef<number | null>(null);
  const pptxPendingPageRef = useRef<number | null>(null);
  const pdfPageCountRef = useRef(pdfPageCount);
  const imagePageCountRef = useRef(imagePageCount);
  const pptxPageCountRef = useRef(pptxPageCount);
  pdfPageCountRef.current = pdfPageCount;
  imagePageCountRef.current = imagePageCount;
  pptxPageCountRef.current = pptxPageCount;
  const pdfPageNavigateListenersRef = useRef(new Set<PageNavigateListener>());
  const imagePageNavigateListenersRef = useRef(new Set<PageNavigateListener>());
  const pptxPageNavigateListenersRef = useRef(new Set<PageNavigateListener>());
  const subscribePdfPageNavigate = useMemo(
    () => createSubscribePageNavigate(pdfPageNavigateListenersRef.current),
    [],
  );
  const subscribeImagePageNavigate = useMemo(
    () => createSubscribePageNavigate(imagePageNavigateListenersRef.current),
    [],
  );
  const subscribePptxPageNavigate = useMemo(
    () => createSubscribePageNavigate(pptxPageNavigateListenersRef.current),
    [],
  );

  useEffect(() => {
    const abortController = new AbortController();
    const sourceType = sourceTypeOf(source);
    setState({ status: "loading" });
    void resolveViewerState(source, abortController.signal)
      .then(({ blob, detection }) => {
        if (abortController.signal.aborted) return;
        if (detection.kind === "unsupported") {
          const error = new Error("Unsupported file type.");
          setState({ status: "unsupported", error, detection });
          onErrorRef.current?.(error, { stage: "detect", sourceType });
          return;
        }
        setState({ status: "ready", blob, detection });
      })
      .catch((unknownError) => {
        if (abortController.signal.aborted) return;
        const error = unknownError instanceof Error ? unknownError : new Error("Failed to load file source.");
        setState({ status: "error", error });
        onErrorRef.current?.(error, { stage: "load", sourceType });
      });
    return () => {
      abortController.abort();
    };
  }, [source]);

  useEffect(() => {
    setRenderError(null);
    setPdfPage(1);
    setPdfPageCount(0);
    setPdfNavIntent(0);
    setPdfGeometryReady(false);
    pdfPendingPageRef.current = null;
    setPdfZoom(100);
    setImageZoom(DEFAULT_IMAGE_ZOOM);
    setImagePage(1);
    setImagePageCount(0);
    setImageNavIntent(0);
    setImageGeometryReady(false);
    imagePendingPageRef.current = null;
    setPptxPage(1);
    setPptxPageCount(0);
    setPptxNavIntent(0);
    setPptxGeometryReady(false);
    pptxPendingPageRef.current = null;
    setPptxZoom(100);
    setSheetNames([]);
    setActiveSheetIndex(0);
    setViewMode("preview");
  }, [source]);

  useEffect(() => {
    if (pdfPageCount < 1) return;
    const pending = pdfPendingPageRef.current;
    pdfPendingPageRef.current = null;
    setPdfPage((current) => setPageWithinBounds(pending ?? current, pdfPageCount));
  }, [pdfPageCount]);

  useEffect(() => {
    if (imagePageCount < 1) return;
    const pending = imagePendingPageRef.current;
    imagePendingPageRef.current = null;
    setImagePage((current) => setPageWithinBounds(pending ?? current, imagePageCount));
  }, [imagePageCount]);

  useEffect(() => {
    if (pptxPageCount < 1) return;
    const pending = pptxPendingPageRef.current;
    pptxPendingPageRef.current = null;
    setPptxPage((current) => setPageWithinBounds(pending ?? current, pptxPageCount));
  }, [pptxPageCount]);

  useEffect(() => {
    if (state.status !== "ready") return;
    if (state.detection.kind === "image" && !isTiffDetection(state.detection)) {
      setImagePageCount(1);
      setImageGeometryReady(true);
    }
  }, [state]);

  const readyDetectionKind = state.status === "ready" ? state.detection.kind : null;
  useEffect(() => {
    if (readyDetectionKind == null) return;
    setViewMode("preview");
  }, [readyDetectionKind]);

  useEffect(() => {
    setRenderError(null);
  }, [pdfPage, pdfZoom, imageZoom, imagePage, pptxPage, pptxZoom, activeSheetIndex]);

  useEffect(() => {
    if (state.status !== "ready") {
      setDownloadUrl((old) => {
        if (old != null) URL.revokeObjectURL(old);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(state.blob);
    setDownloadUrl((old) => {
      if (old != null) URL.revokeObjectURL(old);
      return url;
    });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [state]);

  useEffect(() => {
    if (state.status !== "ready") {
      setObjectUrl((old) => {
        if (old != null) URL.revokeObjectURL(old);
        return null;
      });
      return;
    }
    if (isTiffDetection(state.detection)) {
      setObjectUrl((old) => {
        if (old != null) URL.revokeObjectURL(old);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(state.blob);
    setObjectUrl((old) => {
      if (old != null) URL.revokeObjectURL(old);
      return url;
    });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [state]);

  const failureState = useMemo(() => {
    if (state.status === "unsupported") {
      return { error: state.error, reason: "unsupported" as const };
    }
    if (state.status === "error") {
      return { error: state.error, reason: "error" as const };
    }
    if (renderError == null) return null;
    return { error: renderError, reason: "error" as const };
  }, [renderError, state]);

  const fallback = useMemo(() => {
    if (failureState == null) return null;
    if (renderFallback != null) return renderFallback(failureState.reason);
    return (
      <ViewerStatus centered tone={failureState.reason === "error" ? "error" : "default"}>
        {failureState.reason === "unsupported" ? "Unsupported file type." : failureState.error.message}
      </ViewerStatus>
    );
  }, [failureState, renderFallback]);

  const handleRenderError = useCallback((nextError: Error) => {
    setRenderError(nextError);
    onError?.(nextError, { stage: "render", sourceType: sourceTypeOf(source) });
  }, [onError, source]);

  const handleSheetNamesChange = useCallback((nextSheetNames: string[]) => {
    setSheetNames(nextSheetNames);
    setActiveSheetIndex((current) => {
      if (nextSheetNames.length === 0) return 0;
      return Math.min(current, nextSheetNames.length - 1);
    });
  }, []);

  function requestPdfPage(page: number) {
    setPdfNavIntent((intent) => intent + 1);
    if (pdfPageCountRef.current < 1) {
      pdfPendingPageRef.current = page;
      setPdfPage(Math.max(1, page));
      return;
    }
    pdfPendingPageRef.current = null;
    setPdfPage(setPageWithinBounds(page, pdfPageCountRef.current));
  }

  function requestImagePage(page: number) {
    setImageNavIntent((intent) => intent + 1);
    if (imagePageCountRef.current < 1) {
      imagePendingPageRef.current = page;
      setImagePage(Math.max(1, page));
      return;
    }
    imagePendingPageRef.current = null;
    setImagePage(setPageWithinBounds(page, imagePageCountRef.current));
  }

  function requestPptxPage(page: number) {
    setPptxNavIntent((intent) => intent + 1);
    if (pptxPageCountRef.current < 1) {
      pptxPendingPageRef.current = page;
      setPptxPage(Math.max(1, page));
      return;
    }
    pptxPendingPageRef.current = null;
    setPptxPage(setPageWithinBounds(page, pptxPageCountRef.current));
  }

  const chromeApi = useMemo(() => {
    if (state.status !== "ready" && state.status !== "unsupported") return null;
    return createChromeApi({
      detection: state.detection,
      downloadUrl: state.status === "ready" ? downloadUrl : null,
      enableHtmlPreview,
      viewMode,
      setViewMode,
      pdfPage,
      pdfPageCount,
      pdfGeometryReady,
      pdfZoom,
      imageZoom,
      imagePage,
      imagePageCount,
      imageGeometryReady,
      pptxPage,
      pptxPageCount,
      pptxGeometryReady,
      pptxZoom,
      sheetNames,
      activeSheetIndex,
      setActiveSheetIndex,
      setPdfPage: requestPdfPage,
      setPdfZoom: (zoom) => setPdfZoom(Math.min(Math.max(zoom, MIN_PDF_ZOOM), MAX_PDF_ZOOM)),
      setImageZoom: (zoom) => setImageZoom(clampImageZoom(zoom)),
      setImagePage: requestImagePage,
      setPptxPage: requestPptxPage,
      setPptxZoom: (zoom) => setPptxZoom(Math.min(Math.max(zoom, MIN_PDF_ZOOM), MAX_PDF_ZOOM)),
      subscribePdfPageNavigate,
      subscribeImagePageNavigate,
      subscribePptxPageNavigate,
    });
  }, [
    activeSheetIndex,
    downloadUrl,
    enableHtmlPreview,
    imageGeometryReady,
    imagePage,
    imagePageCount,
    objectUrl,
    pdfGeometryReady,
    pdfPage,
    pdfPageCount,
    pdfZoom,
    imageZoom,
    pptxGeometryReady,
    pptxPage,
    pptxPageCount,
    pptxZoom,
    sheetNames,
    state,
    subscribeImagePageNavigate,
    subscribePdfPageNavigate,
    subscribePptxPageNavigate,
    viewMode,
  ]);

  const chromeContent = useMemo(() => {
    if (chromeApi == null || chrome === "none") return null;
    if (chrome === "default") {
      if (state.status !== "ready") return null;
      return <FileViewerDefaultChrome api={chromeApi} />;
    }
    const ChromeComponent = chrome;
    return <ChromeComponent api={chromeApi} />;
  }, [chrome, chromeApi, state.status]);

  const readyContent = state.status !== "ready" || renderError != null ? fallback : (
    <>
      {state.detection.kind === "text" && <TextRenderer blob={state.blob} onError={handleRenderError} />}
      {state.detection.kind === "markdown" && viewMode === "preview" && (
        <MarkdownRenderer blob={state.blob} onError={handleRenderError} />
      )}
      {state.detection.kind === "markdown" && viewMode === "source" && (
        <TextRenderer blob={state.blob} onError={handleRenderError} />
      )}
      {state.detection.kind === "html" && enableHtmlPreview && viewMode === "preview" && (
        <HtmlRenderer blob={state.blob} onError={handleRenderError} />
      )}
      {state.detection.kind === "html"
        && (!enableHtmlPreview || viewMode === "source") && (
        <TextRenderer blob={state.blob} onError={handleRenderError} />
      )}
      {state.detection.kind === "image" && isTiffDetection(state.detection) && (
        <TiffRenderer
          blob={state.blob}
          page={imagePage}
          navIntent={imageNavIntent}
          zoom={imageZoom}
          onError={handleRenderError}
          onPageCountChange={setImagePageCount}
          onGeometryReadyChange={setImageGeometryReady}
          onVisiblePageChange={(visiblePage) =>
            setImagePage(setPageWithinBounds(visiblePage, imagePageCount))
          }
          onProgrammaticPageNavigateSettled={(settledPage) =>
            emitPageNavigateSettled(imagePageNavigateListenersRef.current, settledPage)
          }
        />
      )}
      {state.detection.kind === "image"
        && !isTiffDetection(state.detection)
        && objectUrl != null && (
        <ImageRenderer
          objectUrl={objectUrl}
          zoom={imageZoom}
          onError={handleRenderError}
          onStepZoom={() => setImageZoom(zoomAfterImageClick(imageZoom))}
          onResetZoom={() => setImageZoom(DEFAULT_IMAGE_ZOOM)}
        />
      )}
      {state.detection.kind === "spreadsheet" && (
        <SpreadsheetRenderer
          blob={state.blob}
          activeSheetIndex={activeSheetIndex}
          onError={handleRenderError}
          onSheetNamesChange={handleSheetNamesChange}
        />
      )}
      {state.detection.kind === "pdf" && (
        <PdfRenderer
          blob={state.blob}
          page={pdfPage}
          pageCount={pdfPageCount}
          navIntent={pdfNavIntent}
          zoom={pdfZoom}
          onError={handleRenderError}
          onPageCountChange={setPdfPageCount}
          onGeometryReadyChange={setPdfGeometryReady}
          onVisiblePageChange={(visiblePage) =>
            setPdfPage(setPageWithinBounds(visiblePage, pdfPageCount))
          }
          onProgrammaticPageNavigateSettled={(settledPage) =>
            emitPageNavigateSettled(pdfPageNavigateListenersRef.current, settledPage)
          }
        />
      )}
      {state.detection.kind === "docx" && <DocxRenderer blob={state.blob} onError={handleRenderError} />}
      {state.detection.kind === "pptx" && (
        <PptxRenderer
          blob={state.blob}
          page={pptxPage}
          navIntent={pptxNavIntent}
          zoom={pptxZoom}
          onError={handleRenderError}
          onPageCountChange={setPptxPageCount}
          onGeometryReadyChange={setPptxGeometryReady}
          onVisiblePageChange={(visiblePage) =>
            setPptxPage(setPageWithinBounds(visiblePage, pptxPageCount))
          }
          onProgrammaticPageNavigateSettled={(settledPage) =>
            emitPageNavigateSettled(pptxPageNavigateListenersRef.current, settledPage)
          }
        />
      )}
    </>
  );

  return (
    <div
      data-file-viewer-root
      className={`flex h-full min-h-0 w-full min-w-0 flex-col rounded border border-(--file-viewer-border,#cbd5e1) bg-(--file-viewer-surface,#ffffff) ${className ?? ""}`}
    >
      {state.status === "loading" && (
        <div className={RENDERER_VIEWPORT_CENTERED_CLASS}>
          <ViewerStatus centered>Loading file...</ViewerStatus>
        </div>
      )}
      {(state.status === "error" || state.status === "unsupported") && chromeContent}
      {(state.status === "error" || state.status === "unsupported") && fallback}
      {state.status === "ready" && (
        <>
          {chromeContent}
          <div className="relative min-h-0 flex-1 overflow-hidden">{readyContent}</div>
        </>
      )}
    </div>
  );
}
