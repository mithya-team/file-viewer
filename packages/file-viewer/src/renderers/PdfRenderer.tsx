import { useEffect, useRef, useState } from "react";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import { ViewerStatus } from "../primitives/ViewerStatus";

interface PdfRendererProps {
  blob: Blob;
  page: number;
  pageCount: number;
  zoom: number;
  onError: (error: Error) => void;
  onPageCountChange: (pageCount: number) => void;
}

/** Below this size, persisted/base64 payloads are almost certainly truncated. */
const MIN_PDF_BYTES = 128;

if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerPort = new PdfWorker();
}

function normalizeRenderError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("Failed to render PDF.");
}

async function loadPdfDocument(blob: Blob): Promise<PDFDocumentProxy> {
  if (blob.size < MIN_PDF_BYTES) {
    throw new Error("PDF data is too small or incomplete.");
  }

  const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  if (
    header[0] !== 0x25
    || header[1] !== 0x50
    || header[2] !== 0x44
    || header[3] !== 0x46
  ) {
    throw new Error("Invalid PDF data.");
  }

  const data = await blob.arrayBuffer();
  const loadingTask = getDocument({ data });
  return loadingTask.promise;
}

export function PdfRenderer({
  blob,
  page,
  pageCount,
  zoom,
  onError,
  onPageCountChange,
}: PdfRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const onErrorRef = useRef(onError);
  const onPageCountChangeRef = useRef(onPageCountChange);

  onErrorRef.current = onError;
  onPageCountChangeRef.current = onPageCountChange;

  useEffect(() => {
    let active = true;
    let loadedDocument: PDFDocumentProxy | null = null;
    setPdfDocument(null);

    void loadPdfDocument(blob)
      .then((document) => {
        if (!active) {
          void document.destroy();
          return;
        }
        loadedDocument = document;
        setPdfDocument(document);
        onPageCountChangeRef.current(document.numPages);
      })
      .catch((error) => {
        if (!active) return;
        onErrorRef.current(normalizeRenderError(error));
      });

    return () => {
      active = false;
      setPdfDocument(null);
      if (loadedDocument != null) {
        void loadedDocument.destroy();
      }
    };
  }, [blob]);

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    const document = pdfDocument;
    if (canvas == null || document == null) return;

    void (async () => {
      try {
        const clampedPage = Math.min(
          Math.max(page, 1),
          Math.max(document.numPages, 1),
        );
        const pdfPage = await document.getPage(clampedPage);
        if (!active) return;

        const viewport = pdfPage.getViewport({ scale: zoom / 100 });
        const pixelRatio =
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const context = canvas.getContext("2d");
        if (context == null) {
          throw new Error("Failed to get PDF canvas context.");
        }

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        await pdfPage.render({ canvasContext: context, viewport }).promise;
      } catch (error) {
        if (!active) return;
        onErrorRef.current(normalizeRenderError(error));
      }
    })();

    return () => {
      active = false;
    };
  }, [pdfDocument, page, zoom]);

  const isDocumentLoading = pdfDocument == null;

  return (
    <div className="h-full overflow-auto p-4">
      {!isDocumentLoading && (
        <div className="mb-3 text-center text-xs text-(--file-viewer-muted,#64748b)">
          Page {page} / {pageCount}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="mx-auto rounded bg-(--file-viewer-surface,#ffffff) [box-shadow:var(--file-viewer-shadow,0_1px_2px_rgb(15_23_42/0.08))]"
      />
      {isDocumentLoading && <ViewerStatus>Loading PDF...</ViewerStatus>}
    </div>
  );
}
