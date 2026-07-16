import { useEffect, useMemo, useRef, useState } from "react";
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
  return Math.min(Math.max(page, 1), Math.max(pageCount, 1));
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
  pdfPage,
  pdfPageCount,
  pdfZoom,
  imageZoom,
  imagePage,
  imagePageCount,
  pptxPage,
  pptxPageCount,
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
  pdfPage: number;
  pdfPageCount: number;
  pdfZoom: number;
  imageZoom: number;
  imagePage: number;
  imagePageCount: number;
  pptxPage: number;
  pptxPageCount: number;
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
      };
    case "html":
      return {
        file: {
          kind: "html",
          mimeType: detection.mimeType,
          downloadUrl,
        },
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
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [imageZoom, setImageZoom] = useState(DEFAULT_IMAGE_ZOOM);
  const [imagePage, setImagePage] = useState(1);
  const [imagePageCount, setImagePageCount] = useState(1);
  const [pptxPage, setPptxPage] = useState(1);
  const [pptxPageCount, setPptxPageCount] = useState(1);
  const [pptxZoom, setPptxZoom] = useState(100);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
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
    setPdfPageCount(1);
    setPdfZoom(100);
    setImageZoom(DEFAULT_IMAGE_ZOOM);
    setImagePage(1);
    setImagePageCount(1);
    setPptxPage(1);
    setPptxPageCount(1);
    setPptxZoom(100);
    setSheetNames([]);
    setActiveSheetIndex(0);
  }, [source]);

  useEffect(() => {
    setPdfPage((current) => setPageWithinBounds(current, pdfPageCount));
  }, [pdfPageCount]);

  useEffect(() => {
    setImagePage((current) => setPageWithinBounds(current, imagePageCount));
  }, [imagePageCount]);

  useEffect(() => {
    setPptxPage((current) => setPageWithinBounds(current, pptxPageCount));
  }, [pptxPageCount]);

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

  function handleRenderError(nextError: Error) {
    setRenderError(nextError);
    onError?.(nextError, { stage: "render", sourceType: sourceTypeOf(source) });
  }

  function handleSheetNamesChange(nextSheetNames: string[]) {
    setSheetNames(nextSheetNames);
    setActiveSheetIndex((current) => {
      if (nextSheetNames.length === 0) return 0;
      return Math.min(current, nextSheetNames.length - 1);
    });
  }

  const chromeApi = useMemo(() => {
    if (state.status !== "ready" && state.status !== "unsupported") return null;
    return createChromeApi({
      detection: state.detection,
      downloadUrl: state.status === "ready" ? downloadUrl : null,
      pdfPage,
      pdfPageCount,
      pdfZoom,
      imageZoom,
      imagePage,
      imagePageCount,
      pptxPage,
      pptxPageCount,
      pptxZoom,
      sheetNames,
      activeSheetIndex,
      setActiveSheetIndex,
      setPdfPage: (page) => setPdfPage(setPageWithinBounds(page, pdfPageCount)),
      setPdfZoom: (zoom) => setPdfZoom(Math.min(Math.max(zoom, MIN_PDF_ZOOM), MAX_PDF_ZOOM)),
      setImageZoom: (zoom) => setImageZoom(clampImageZoom(zoom)),
      setImagePage: (page) => setImagePage(setPageWithinBounds(page, imagePageCount)),
      setPptxPage: (page) => setPptxPage(setPageWithinBounds(page, pptxPageCount)),
      setPptxZoom: (zoom) => setPptxZoom(Math.min(Math.max(zoom, MIN_PDF_ZOOM), MAX_PDF_ZOOM)),
      subscribePdfPageNavigate,
      subscribeImagePageNavigate,
      subscribePptxPageNavigate,
    });
  }, [
    activeSheetIndex,
    downloadUrl,
    imagePage,
    imagePageCount,
    objectUrl,
    pdfPage,
    pdfPageCount,
    pdfZoom,
    imageZoom,
    pptxPage,
    pptxPageCount,
    pptxZoom,
    sheetNames,
    state,
    subscribeImagePageNavigate,
    subscribePdfPageNavigate,
    subscribePptxPageNavigate,
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
      {state.detection.kind === "markdown" && (
        <MarkdownRenderer blob={state.blob} onError={handleRenderError} />
      )}
      {state.detection.kind === "html" && enableHtmlPreview && (
        <HtmlRenderer blob={state.blob} onError={handleRenderError} />
      )}
      {state.detection.kind === "html" && !enableHtmlPreview && (
        <TextRenderer blob={state.blob} onError={handleRenderError} />
      )}
      {state.detection.kind === "image" && isTiffDetection(state.detection) && (
        <TiffRenderer
          blob={state.blob}
          page={imagePage}
          zoom={imageZoom}
          onError={handleRenderError}
          onPageCountChange={setImagePageCount}
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
          zoom={pdfZoom}
          onError={handleRenderError}
          onPageCountChange={setPdfPageCount}
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
          zoom={pptxZoom}
          onError={handleRenderError}
          onPageCountChange={setPptxPageCount}
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
