import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  FileViewer,
  type FileViewerChromeApi,
  type FileViewerSource,
} from "../src";
import type {
  DetectionResult,
  ImageChromeApi,
  PDFChromeApi,
  SpreadsheetChromeApi,
} from "../src/types";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const {
  detectFileKindMock,
  loadSourceToBlobMock,
  resetMockState,
  seenPdfBlobs,
  seenSpreadsheetBlobs,
  pdfRendererTestState,
} = vi.hoisted(() => {
  const loadSourceToBlobMock =
    vi.fn<(source: FileViewerSource, signal: AbortSignal) => Promise<Blob>>();
  const detectFileKindMock = vi.fn<(blob: Blob) => Promise<DetectionResult>>();
  const seenPdfBlobs = new WeakSet<Blob>();
  const seenSpreadsheetBlobs = new WeakSet<Blob>();
  const pdfRendererTestState = {
    renderError: null as Error | null,
  };

  return {
    loadSourceToBlobMock,
    detectFileKindMock,
    seenPdfBlobs,
    seenSpreadsheetBlobs,
    pdfRendererTestState,
    resetMockState: () => {
      loadSourceToBlobMock.mockReset();
      detectFileKindMock.mockReset();
      pdfRendererTestState.renderError = null;
    },
  };
});

vi.mock("../src/source/loadSourceToBlob", () => ({
  loadSourceToBlob: loadSourceToBlobMock,
}));

vi.mock("../src/detect/detectFileKind", () => ({
  detectFileKind: detectFileKindMock,
}));

vi.mock("../src/renderers/TiffRenderer", () => {
  const { useEffect } = require("react") as typeof import("react");
  return {
    TiffRenderer: ({
      page,
      zoom,
      onPageCountChange,
      onGeometryReadyChange,
      onVisiblePageChange,
    }: {
      page: number;
      zoom: number;
      onPageCountChange: (count: number) => void;
      onGeometryReadyChange?: (ready: boolean) => void;
      onVisiblePageChange?: (page: number) => void;
    }) => {
      useEffect(() => {
        onPageCountChange(2);
        onGeometryReadyChange?.(true);
      }, [onGeometryReadyChange, onPageCountChange]);
      return (
        <div
          data-renderer="tiff"
          data-page={page}
          data-zoom={zoom}
          onClick={() => onVisiblePageChange?.(2)}
        >
          TIFF renderer
        </div>
      );
    },
  };
});

vi.mock("../src/renderers/ImageRenderer", () => ({
  ImageRenderer: ({
    objectUrl,
    zoom,
    onError,
    onStepZoom,
    onResetZoom,
  }: {
    objectUrl: string;
    zoom: number;
    onError: (error: Error) => void;
    onStepZoom: () => void;
    onResetZoom: () => void;
  }) => (
    <img
      data-renderer="image"
      data-zoom={zoom}
      src={objectUrl}
      alt="Rendered file"
      onPointerUp={() => onStepZoom()}
      onError={() => onError(new Error("Failed to render image."))}
    />
  ),
}));

vi.mock("../src/renderers/TextRenderer", () => ({
  TextRenderer: () => <div data-renderer="text">Text renderer</div>,
}));

vi.mock("../src/renderers/MarkdownRenderer", () => ({
  MarkdownRenderer: () => <div data-renderer="markdown">Markdown renderer</div>,
}));

vi.mock("../src/renderers/HtmlRenderer", () => ({
  HtmlRenderer: () => <div data-renderer="html">HTML renderer</div>,
}));

vi.mock("../src/renderers/DocxRenderer", () => ({
  DocxRenderer: () => <div data-renderer="docx">Docx renderer</div>,
}));

vi.mock("../src/renderers/PptxRenderer", () => {
  const { useEffect } = require("react") as typeof import("react");
  return {
    PptxRenderer: ({
      page,
      zoom,
      onPageCountChange,
      onGeometryReadyChange,
      onVisiblePageChange,
    }: {
      page: number;
      zoom: number;
      onPageCountChange: (count: number) => void;
      onGeometryReadyChange?: (ready: boolean) => void;
      onVisiblePageChange?: (page: number) => void;
    }) => {
      useEffect(() => {
        onPageCountChange(5);
        onGeometryReadyChange?.(true);
      }, [onGeometryReadyChange, onPageCountChange]);
      return (
        <div
          data-renderer="pptx"
          data-page={page}
          data-zoom={zoom}
          onClick={() => onVisiblePageChange?.(3)}
        >
          PPTX renderer
        </div>
      );
    },
  };
});

vi.mock("../src/renderers/PdfRenderer", () => ({
  PdfRenderer: ({
    blob,
    page,
    zoom,
    onError,
    onPageCountChange,
    onGeometryReadyChange,
  }: {
    blob: Blob;
    page: number;
    zoom: number;
    onError: (error: Error) => void;
    onPageCountChange: (pageCount: number) => void;
    onGeometryReadyChange?: (ready: boolean) => void;
  }) => {
    if (!seenPdfBlobs.has(blob)) {
      seenPdfBlobs.add(blob);
      queueMicrotask(() => {
        onPageCountChange(3);
        onGeometryReadyChange?.(true);
      });
    }

    if (pdfRendererTestState.renderError != null) {
      const error = pdfRendererTestState.renderError;
      pdfRendererTestState.renderError = null;
      queueMicrotask(() => {
        onError(error);
      });
    }

    return (
      <div data-renderer="pdf">
        PDF renderer page={page} zoom={zoom}
      </div>
    );
  },
}));

vi.mock("../src/renderers/SpreadsheetRenderer", () => ({
  SpreadsheetRenderer: ({
    blob,
    activeSheetIndex,
    onSheetNamesChange,
  }: {
    blob: Blob;
    activeSheetIndex: number;
    onSheetNamesChange: (sheetNames: string[]) => void;
  }) => {
    if (!seenSpreadsheetBlobs.has(blob)) {
      seenSpreadsheetBlobs.add(blob);
      queueMicrotask(() => {
        onSheetNamesChange(
          blob.type === "text/csv" ? [] : ["Sheet A", "Sheet B"],
        );
      });
    }

    return (
      <div data-renderer="spreadsheet">
        Spreadsheet renderer sheet={activeSheetIndex}
      </div>
    );
  },
}));

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function waitFor<T>(read: () => T | null, attempts = 20): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = read();
    if (value != null) return value;
    await flush();
  }
  throw new Error("Timed out waiting for value.");
}

function findAllByText(renderer: ReactTestRenderer | undefined, text: string) {
  if (renderer == null) return [];
  return renderer.root.findAll((node) => node.children.join("") === text);
}

describe("FileViewer", () => {
  let renderer: ReactTestRenderer | undefined;
  let originalCreateObjectURL: typeof URL.createObjectURL | undefined;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleError: typeof console.error;
  const isPDFChromeApi = (api: FileViewerChromeApi): api is PDFChromeApi => {
      return api.file.kind === "pdf";
    };
  const isImageChromeApi = (api: FileViewerChromeApi): api is ImageChromeApi => {
    return api.file.kind === "image";
  };


  function mockResolvedSource(detection: DetectionResult) {
    const blob = new Blob(["fixture"], { type: detection.mimeType });
    loadSourceToBlobMock.mockResolvedValue(blob);
    detectFileKindMock.mockResolvedValue(detection);
    return blob;
  }

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    resetMockState();
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    URL.createObjectURL = vi.fn(() => "blob:test-url");
    URL.revokeObjectURL = vi.fn(() => undefined);
    vi.spyOn(console, "warn").mockImplementation((message, ...args) => {
      if (
        String(message).includes(
          "Please use the `legacy` build in Node.js environments.",
        )
      ) {
        return;
      }
      originalConsoleWarn(message, ...args);
    });
    vi.spyOn(console, "error").mockImplementation((message, ...args) => {
      if (String(message).includes("react-test-renderer is deprecated.")) {
        return;
      }
      originalConsoleError(message, ...args);
    });
  });

  afterEach(async () => {
    if (renderer != null) {
      await act(async () => {
        renderer?.unmount();
      });
    }
    renderer = undefined;
    globalThis.IS_REACT_ACT_ENVIRONMENT = undefined;
    URL.createObjectURL = originalCreateObjectURL as typeof URL.createObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL as typeof URL.revokeObjectURL;
    vi.restoreAllMocks();
  });

  it("renders built-in chrome by default", async () => {
    mockResolvedSource({
      kind: "spreadsheet",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await act(async () => {
      renderer = create(<FileViewer source="fixture" />);
    });

    const defaultChrome = await waitFor(
      () =>
        renderer?.root.findAllByProps({
          "data-file-viewer-chrome": "default",
        })[0] ?? null,
    );

    expect(defaultChrome.props["data-file-viewer-chrome"]).toBe("default");
    expect(findAllByText(renderer, "Sheet A").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "Download").length).toBeGreaterThan(0);
  });

  it("omits built-in chrome when chrome is none", async () => {
    mockResolvedSource({
      kind: "pdf",
      mimeType: "application/pdf",
    });

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome="none" />);
    });

    await waitFor(
      () =>
        renderer?.root.findAllByProps({ "data-renderer": "pdf" })[0] ?? null,
    );

    expect(
      renderer?.root.findAllByProps({ "data-file-viewer-chrome": "default" }),
    ).toHaveLength(0);
    expect(findAllByText(renderer, "Download")).toHaveLength(0);
  });

  it("lets custom chrome drive pdf page and zoom state", async () => {
    mockResolvedSource({
      kind: "pdf",
      mimeType: "application/pdf",
    });
    
    function PdfChrome({ api }: { api: FileViewerChromeApi }) {
      if (!isPDFChromeApi(api))
        return <div data-chrome-kind={api.file.kind}>{api.file.kind}</div>;

      return (
        <div data-chrome-kind="pdf">
          <span>{`page:${api.pdf.page}/${api.pdf.pageCount}`}</span>
          <span>{`zoom:${api.pdf.zoom}`}</span>
          <button type="button" onClick={api.pdf.nextPage}>
            Next page
          </button>
          <button type="button" onClick={api.pdf.zoomIn}>
            Zoom in
          </button>
          {api.file.downloadUrl != null && (
            <a href={api.file.downloadUrl}>Custom download</a>
          )}
        </div>
      );
    }

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome={PdfChrome} />);
    });

    await waitFor(() => findAllByText(renderer, "page:1/3")[0] ?? null);

    const nextPageButton = renderer?.root
      .findAllByType("button")
      .find((button) => button.children.join("") === "Next page");
    const zoomInButton = renderer?.root
      .findAllByType("button")
      .find((button) => button.children.join("") === "Zoom in");

    expect(nextPageButton).toBeDefined();
    expect(zoomInButton).toBeDefined();

    await act(async () => {
      nextPageButton?.props.onClick();
      zoomInButton?.props.onClick();
    });

    expect(findAllByText(renderer, "page:2/3").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "zoom:110").length).toBeGreaterThan(0);
    expect(
      findAllByText(renderer, "PDF renderer page=2 zoom=110").length,
    ).toBeGreaterThan(0);
    expect(findAllByText(renderer, "Custom download").length).toBeGreaterThan(
      0,
    );
  });

  it("queues early pdf setPage until pageCount is known", async () => {
    mockResolvedSource({
      kind: "pdf",
      mimeType: "application/pdf",
    });

    const jumpedRef = { current: false };

    function CitationChrome({ api }: { api: FileViewerChromeApi }) {
      if (!isPDFChromeApi(api)) return null;
      if (!jumpedRef.current) {
        jumpedRef.current = true;
        queueMicrotask(() => {
          api.pdf.setPage(3);
        });
      }
      return (
        <div data-chrome-kind="pdf">
          <span>{`page:${api.pdf.page}/${api.pdf.pageCount}`}</span>
          <span>{`geometry:${api.pdf.geometryReady ? "ready" : "pending"}`}</span>
        </div>
      );
    }

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome={CitationChrome} />);
    });

    await waitFor(() => findAllByText(renderer, "page:3/3")[0] ?? null);
    await waitFor(() => findAllByText(renderer, "geometry:ready")[0] ?? null);
    expect(
      findAllByText(renderer, "PDF renderer page=3 zoom=100").length,
    ).toBeGreaterThan(0);
  });

  it("exposes workbook sheet controls but not csv sheet controls", async () => {
    const isSpreadSheetChromeApi = (
      api: FileViewerChromeApi,
    ): api is SpreadsheetChromeApi => {
      return api.file.kind === "spreadsheet";
    };
    function SpreadsheetChrome({ api }: { api: FileViewerChromeApi }) {
      if (!isSpreadSheetChromeApi(api)) {
        return <div data-chrome-kind={api.file.kind}>{api.file.kind}</div>;
      }

      return (
        <div data-chrome-kind="spreadsheet">
          {api.file.mimeType === "text/csv" ? (
            <span>csv-no-sheet-controls</span>
          ) : (
            <>
              <span>{`sheet-count:${api.spreadsheet.sheetNames?.length ?? 0}`}</span>
              <button
                type="button"
                onClick={() => api.spreadsheet.setActiveSheetIndex?.(1)}
              >
                Sheet B
              </button>
            </>
          )}
        </div>
      );
    }

    mockResolvedSource({
      kind: "spreadsheet",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await act(async () => {
      renderer = create(
        <FileViewer source="workbook" chrome={SpreadsheetChrome} />,
      );
    });

    await waitFor(() => findAllByText(renderer, "sheet-count:2")[0] ?? null);

    const sheetButton = renderer?.root
      .findAllByType("button")
      .find((button) => button.children.join("") === "Sheet B");
    expect(sheetButton).toBeDefined();

    await act(async () => {
      sheetButton?.props.onClick();
    });

    expect(
      findAllByText(renderer, "Spreadsheet renderer sheet=1").length,
    ).toBeGreaterThan(0);

    mockResolvedSource({
      kind: "spreadsheet",
      mimeType: "text/csv",
    });

    await act(async () => {
      renderer?.update(<FileViewer source="csv" chrome={SpreadsheetChrome} />);
    });

    await waitFor(
      () => findAllByText(renderer, "csv-no-sheet-controls")[0] ?? null,
    );

    expect(findAllByText(renderer, "sheet-count:2")).toHaveLength(0);
    expect(findAllByText(renderer, "Sheet B")).toHaveLength(0);
  });

  it("resets chrome state when the source changes", async () => {
    mockResolvedSource({
      kind: "pdf",
      mimeType: "application/pdf",
    });

    function ResetChrome({ api }: { api: FileViewerChromeApi }) {
      if (!isPDFChromeApi(api)) {
        return <div>{api.file.kind}</div>;
      }

      return (
        <div>
          <span>{`page:${api.pdf.page}`}</span>
          <span>{`zoom:${api.pdf.zoom}`}</span>
          <button type="button" onClick={api.pdf.nextPage}>
            Next page
          </button>
          <button type="button" onClick={api.pdf.zoomIn}>
            Zoom in
          </button>
        </div>
      );
    }

    await act(async () => {
      renderer = create(<FileViewer source="first" chrome={ResetChrome} />);
    });

    await waitFor(() => findAllByText(renderer, "page:1")[0] ?? null);

    const nextPageButton = renderer?.root
      .findAllByType("button")
      .find((button) => button.children.join("") === "Next page");
    const zoomInButton = renderer?.root
      .findAllByType("button")
      .find((button) => button.children.join("") === "Zoom in");

    await act(async () => {
      nextPageButton?.props.onClick();
      zoomInButton?.props.onClick();
    });

    expect(findAllByText(renderer, "page:2").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "zoom:110").length).toBeGreaterThan(0);

    mockResolvedSource({
      kind: "pdf",
      mimeType: "application/pdf",
    });

    await act(async () => {
      renderer?.update(<FileViewer source="second" chrome={ResetChrome} />);
    });

    await waitFor(() => findAllByText(renderer, "page:1")[0] ?? null);

    expect(findAllByText(renderer, "zoom:100").length).toBeGreaterThan(0);
  });

  it("shows custom chrome for unsupported detection and routes detect errors through fallback", async () => {
    const onError = vi.fn();
    const renderFallback = vi.fn((reason: "unsupported" | "error") => (
      <div data-reason={reason}>Fallback: {reason}</div>
    ));

    mockResolvedSource({
      kind: "unsupported",
      mimeType: "application/octet-stream",
    });

    function UnsupportedChrome({ api }: { api: FileViewerChromeApi }) {
      return <div data-chrome-kind={api.file.kind}>{api.file.kind}</div>;
    }

    await act(async () => {
      renderer = create(
        <FileViewer
          source="fixture"
          chrome={UnsupportedChrome}
          onError={onError}
          renderFallback={renderFallback}
        />,
      );
    });

    const fallback = await waitFor(
      () =>
        renderer?.root.findAllByProps({ "data-reason": "unsupported" })[0] ??
        null,
    );

    expect(fallback.children.join("")).toContain("Fallback: unsupported");
    expect(
      renderer?.root.findAllByProps({ "data-chrome-kind": "unsupported" }),
    ).toHaveLength(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), {
      stage: "detect",
      sourceType: "string",
    });
  });

  it("routes load failures through fallback and onError without rendering chrome", async () => {
    const onError = vi.fn();
    const renderFallback = vi.fn((reason: "unsupported" | "error") => (
      <div data-reason={reason}>Fallback: {reason}</div>
    ));

    loadSourceToBlobMock.mockRejectedValue(new Error("Load failed."));

    function LoadErrorChrome({ api }: { api: FileViewerChromeApi }) {
      return <div data-chrome-kind={api.file.kind}>{api.file.kind}</div>;
    }

    await act(async () => {
      renderer = create(
        <FileViewer
          source="fixture"
          chrome={LoadErrorChrome}
          onError={onError}
          renderFallback={renderFallback}
        />,
      );
    });

    const fallback = await waitFor(
      () =>
        renderer?.root.findAllByProps({ "data-reason": "error" })[0] ?? null,
    );

    expect(fallback.children.join("")).toContain("Fallback: error");
    expect(
      renderer?.root.findAllByProps({ "data-chrome-kind": "unsupported" }),
    ).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), {
      stage: "load",
      sourceType: "string",
    });
  });

  it("shows pdf render errors in fallback and forwards them through onError", async () => {
    const onError = vi.fn();
    pdfRendererTestState.renderError = new Error("Corrupt PDF.");

    mockResolvedSource({
      kind: "pdf",
      mimeType: "application/pdf",
    });

    await act(async () => {
      renderer = create(
        <FileViewer
          source="fixture"
          chrome="none"
          onError={onError}
        />,
      );
    });

    await waitFor(() => findAllByText(renderer, "Corrupt PDF.")[0] ?? null);

    expect(
      renderer?.root.findAllByProps({ "data-renderer": "pdf" }),
    ).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Corrupt PDF." }),
      { stage: "render", sourceType: "string" },
    );
  });

  it("clears pdf render errors when page or zoom changes", async () => {
    pdfRendererTestState.renderError = new Error("Corrupt PDF.");

    mockResolvedSource({
      kind: "pdf",
      mimeType: "application/pdf",
    });

    function PdfRetryChrome({ api }: { api: FileViewerChromeApi }) {
      if (!isPDFChromeApi(api)) return null;

      return (
        <div>
          <button type="button" onClick={api.pdf.nextPage}>
            Next page
          </button>
          <button type="button" onClick={api.pdf.zoomIn}>
            Zoom in
          </button>
        </div>
      );
    }

    await act(async () => {
      renderer = create(
        <FileViewer source="fixture" chrome={PdfRetryChrome} />,
      );
    });

    await waitFor(() => findAllByText(renderer, "Corrupt PDF.")[0] ?? null);

    const nextPageButton = renderer?.root
      .findAllByType("button")
      .find((button) => button.children.join("") === "Next page");

    await act(async () => {
      nextPageButton?.props.onClick();
    });

    await waitFor(
      () =>
        renderer?.root.findAllByProps({ "data-renderer": "pdf" })[0] ?? null,
    );

    expect(findAllByText(renderer, "Corrupt PDF.")).toHaveLength(0);
    expect(
      findAllByText(renderer, "PDF renderer page=2 zoom=100").length,
    ).toBeGreaterThan(0);

    pdfRendererTestState.renderError = new Error("Corrupt PDF.");

    await act(async () => {
      renderer?.update(<FileViewer source="fixture" chrome={PdfRetryChrome} />);
    });

    await waitFor(() => findAllByText(renderer, "Corrupt PDF.")[0] ?? null);

    const zoomInButton = renderer?.root
      .findAllByType("button")
      .find((button) => button.children.join("") === "Zoom in");

    await act(async () => {
      zoomInButton?.props.onClick();
    });

    await waitFor(
      () =>
        renderer?.root.findAllByProps({ "data-renderer": "pdf" })[0] ?? null,
    );

    expect(findAllByText(renderer, "Corrupt PDF.")).toHaveLength(0);
    expect(
      findAllByText(renderer, "PDF renderer page=2 zoom=110").length,
    ).toBeGreaterThan(0);
  });

  it("lets custom chrome drive image zoom state", async () => {
    mockResolvedSource({
      kind: "image",
      mimeType: "image/png",
    });

    function ImageChrome({ api }: { api: FileViewerChromeApi }) {
      if (!isImageChromeApi(api)) {
        return <div data-chrome-kind={api.file.kind}>{api.file.kind}</div>;
      }

      return (
        <div data-chrome-kind="image">
          <span>{`zoom:${api.image.zoom}`}</span>
          <button type="button" onClick={api.image.zoomIn}>
            Zoom in
          </button>
        </div>
      );
    }

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome={ImageChrome} />);
    });

    await waitFor(() => renderer?.root.findAllByProps({ "data-renderer": "image" })[0] ?? null);

    const zoomInButton = renderer?.root
      .findAll((node) => node.type === "button")
      .find((button) => button.children.join("") === "Zoom in");

    await act(async () => {
      zoomInButton?.props.onClick();
    });

    expect(findAllByText(renderer, "zoom:110").length).toBeGreaterThan(0);
    const image = renderer?.root.findAllByProps({ "data-renderer": "image" })[0];
    expect(image?.props["data-zoom"]).toBe(110);
  });

  it("routes TIFF to TiffRenderer and exposes page chrome API", async () => {
    mockResolvedSource({
      kind: "image",
      mimeType: "image/tiff",
    });

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome="default" />);
    });

    const tiff = await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "tiff" })[0] ?? null,
    );
    expect(tiff).not.toBeNull();
    expect(renderer?.root.findAllByProps({ "data-renderer": "image" })).toHaveLength(0);

    await act(async () => {
      await Promise.resolve();
    });

    expect(findAllByText(renderer, "Prev").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "Next").length).toBeGreaterThan(0);

    await act(async () => {
      tiff.props.onClick();
    });

    expect(tiff.props["data-page"]).toBe(2);
  });

  it("passes zoom callbacks to ImageRenderer when chrome is none", async () => {
    mockResolvedSource({
      kind: "image",
      mimeType: "image/png",
    });

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome="none" />);
    });

    const image = await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "image" })[0] ?? null,
    );

    expect(image.props["data-zoom"]).toBe(100);

    await act(async () => {
      image.props.onPointerUp({ pointerId: 1, stopPropagation: () => undefined });
    });

    expect(renderer?.root.findAllByProps({ "data-renderer": "image" })[0]?.props["data-zoom"]).toBe(150);
  });

  it("routes PPTX to PptxRenderer and exposes page chrome API", async () => {
    mockResolvedSource({
      kind: "pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome="default" />);
    });

    const pptx = await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "pptx" })[0] ?? null,
    );
    expect(pptx).not.toBeNull();

    await act(async () => {
      await Promise.resolve();
    });

    expect(findAllByText(renderer, "Prev").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "Next").length).toBeGreaterThan(0);

    await act(async () => {
      pptx.props.onClick();
    });

    expect(pptx.props["data-page"]).toBe(3);
  });

  it("routes markdown to MarkdownRenderer with Preview Source chrome", async () => {
    mockResolvedSource({
      kind: "markdown",
      mimeType: "text/markdown",
    });

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome="default" />);
    });

    const markdown = await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "markdown" })[0] ?? null,
    );
    expect(markdown).not.toBeNull();
    expect(findAllByText(renderer, "MARKDOWN").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "Preview").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "Source").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "Prev")).toHaveLength(0);
  });

  it("switches markdown to TextRenderer when Source is selected", async () => {
    mockResolvedSource({
      kind: "markdown",
      mimeType: "text/markdown",
    });

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome="default" />);
    });

    await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "markdown" })[0] ?? null,
    );

    const sourceButton = findAllByText(renderer, "Source")[0];
    expect(sourceButton).toBeDefined();
    await act(async () => {
      sourceButton.props.onClick?.();
    });

    const text = await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "text" })[0] ?? null,
    );
    expect(text).not.toBeNull();
    expect(renderer?.root.findAllByProps({ "data-renderer": "markdown" })).toHaveLength(0);
  });

  it("defaults html to text fallback without iframe", async () => {
    mockResolvedSource({
      kind: "html",
      mimeType: "text/html",
    });

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome="default" />);
    });

    const text = await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "text" })[0] ?? null,
    );
    expect(text).not.toBeNull();
    expect(renderer?.root.findAllByProps({ "data-renderer": "html" })).toHaveLength(0);
    expect(findAllByText(renderer, "HTML").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "Preview")).toHaveLength(0);
    expect(findAllByText(renderer, "Source")).toHaveLength(0);
  });

  it("routes html to HtmlRenderer when enableHtmlPreview is true", async () => {
    mockResolvedSource({
      kind: "html",
      mimeType: "text/html",
    });

    await act(async () => {
      renderer = create(
        <FileViewer source="fixture" chrome="default" enableHtmlPreview />,
      );
    });

    const html = await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "html" })[0] ?? null,
    );
    expect(html).not.toBeNull();
    expect(renderer?.root.findAllByProps({ "data-renderer": "text" })).toHaveLength(0);
    expect(findAllByText(renderer, "Preview").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "Source").length).toBeGreaterThan(0);
    expect(findAllByText(renderer, "Prev")).toHaveLength(0);
  });

  it("switches html to TextRenderer when Source is selected with preview enabled", async () => {
    mockResolvedSource({
      kind: "html",
      mimeType: "text/html",
    });

    await act(async () => {
      renderer = create(
        <FileViewer source="fixture" chrome="default" enableHtmlPreview />,
      );
    });

    await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "html" })[0] ?? null,
    );

    const sourceButton = findAllByText(renderer, "Source")[0];
    expect(sourceButton).toBeDefined();
    await act(async () => {
      sourceButton.props.onClick?.();
    });

    const text = await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "text" })[0] ?? null,
    );
    expect(text).not.toBeNull();
    expect(renderer?.root.findAllByProps({ "data-renderer": "html" })).toHaveLength(0);
  });

  it("forces html text path and drops toggle when enableHtmlPreview turns off", async () => {
    mockResolvedSource({
      kind: "html",
      mimeType: "text/html",
    });

    await act(async () => {
      renderer = create(
        <FileViewer source="fixture" chrome="default" enableHtmlPreview />,
      );
    });

    await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "html" })[0] ?? null,
    );
    expect(findAllByText(renderer, "Source").length).toBeGreaterThan(0);

    await act(async () => {
      renderer?.update(<FileViewer source="fixture" chrome="default" />);
    });

    const text = await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "text" })[0] ?? null,
    );
    expect(text).not.toBeNull();
    expect(renderer?.root.findAllByProps({ "data-renderer": "html" })).toHaveLength(0);
    expect(findAllByText(renderer, "Preview")).toHaveLength(0);
    expect(findAllByText(renderer, "Source")).toHaveLength(0);
  });

  it("resets markdown viewMode to preview when source changes", async () => {
    mockResolvedSource({
      kind: "markdown",
      mimeType: "text/markdown",
    });

    await act(async () => {
      renderer = create(<FileViewer source="first" chrome="default" />);
    });

    await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "markdown" })[0] ?? null,
    );

    const sourceButton = findAllByText(renderer, "Source")[0];
    await act(async () => {
      sourceButton.props.onClick?.();
    });
    await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "text" })[0] ?? null,
    );

    mockResolvedSource({
      kind: "markdown",
      mimeType: "text/markdown",
    });

    await act(async () => {
      renderer?.update(<FileViewer source="second" chrome="default" />);
    });

    const markdown = await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "markdown" })[0] ?? null,
    );
    expect(markdown).not.toBeNull();
    expect(renderer?.root.findAllByProps({ "data-renderer": "text" })).toHaveLength(0);
  });

  it("exposes markdown viewMode on custom chrome API", async () => {
    mockResolvedSource({
      kind: "markdown",
      mimeType: "text/markdown",
    });

    let latestApi: FileViewerChromeApi | null = null;
    function MarkdownChrome({ api }: { api: FileViewerChromeApi }) {
      latestApi = api;
      if (api.file.kind !== "markdown") {
        return <div data-chrome-kind={api.file.kind}>{api.file.kind}</div>;
      }
      return (
        <div data-chrome-kind="markdown" data-view-mode={api.markdown.viewMode}>
          <button type="button" onClick={() => api.markdown.setViewMode("source")}>
            Go source
          </button>
        </div>
      );
    }

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome={MarkdownChrome} />);
    });

    await waitFor(
      () => renderer?.root.findAllByProps({ "data-chrome-kind": "markdown" })[0] ?? null,
    );
    expect(latestApi?.file.kind).toBe("markdown");
    if (latestApi?.file.kind === "markdown") {
      expect(latestApi.markdown.viewMode).toBe("preview");
    }

    const goSource = findAllByText(renderer, "Go source")[0];
    await act(async () => {
      goSource.props.onClick?.();
    });

    await waitFor(
      () => renderer?.root.findAllByProps({ "data-renderer": "text" })[0] ?? null,
    );
    if (latestApi?.file.kind === "markdown") {
      expect(latestApi.markdown.viewMode).toBe("source");
    }
  });

  it("omits html chrome controls when enableHtmlPreview is false", async () => {
    mockResolvedSource({
      kind: "html",
      mimeType: "text/html",
    });

    let latestApi: FileViewerChromeApi | null = null;
    function HtmlChrome({ api }: { api: FileViewerChromeApi }) {
      latestApi = api;
      return <div data-chrome-kind={api.file.kind} />;
    }

    await act(async () => {
      renderer = create(<FileViewer source="fixture" chrome={HtmlChrome} />);
    });

    await waitFor(
      () => renderer?.root.findAllByProps({ "data-chrome-kind": "html" })[0] ?? null,
    );
    expect(latestApi?.file.kind).toBe("html");
    if (latestApi?.file.kind === "html") {
      expect(latestApi.html).toBeUndefined();
    }
  });

  it("routes renderer failures through renderFallback and onError", async () => {
    const onError = vi.fn();
    const renderFallback = vi.fn((reason: "unsupported" | "error") => (
      <div data-reason={reason}>Fallback: {reason}</div>
    ));

    mockResolvedSource({
      kind: "image",
      mimeType: "image/png",
    });

    await act(async () => {
      renderer = create(
        <FileViewer
          source="fixture"
          onError={onError}
          renderFallback={renderFallback}
        />,
      );
    });

    const image = await waitFor(
      () => renderer?.root.findAllByType("img")[0] ?? null,
    );

    await act(async () => {
      image.props.onError();
    });

    const fallback = await waitFor(
      () =>
        renderer?.root.findAllByProps({ "data-reason": "error" })[0] ?? null,
    );

    expect(fallback.children.join("")).toContain("Fallback: error");
    expect(renderFallback).toHaveBeenCalledWith("error");
    expect(onError).toHaveBeenCalledWith(expect.any(Error), {
      stage: "render",
      sourceType: "string",
    });
  });
});
