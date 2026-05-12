import { useEffect, useRef } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
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

if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerPort = new PdfWorker();
}

async function renderPdfPage(
  blob: Blob,
  page: number,
  zoom: number,
  canvas: HTMLCanvasElement,
  onPageCountChange: (pageCount: number) => void,
) {
  const data = await blob.arrayBuffer();
  const loadingTask = getDocument({ data });
  const document = await loadingTask.promise;
  try {
    onPageCountChange(document.numPages);
    const clampedPage = Math.min(page, document.numPages);
    const pdfPage = await document.getPage(clampedPage);
    const viewport = pdfPage.getViewport({ scale: zoom / 100 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (context == null) {
      throw new Error("Failed to get PDF canvas context.");
    }
    await pdfPage.render({ canvasContext: context, viewport }).promise;
  } finally {
    await document.destroy();
  }
}

export function PdfRenderer({ blob, page, pageCount, zoom, onError, onPageCountChange }: PdfRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (canvas == null) return;
    void renderPdfPage(blob, page, zoom, canvas, onPageCountChange).catch(() => {
      if (!active) return;
      onError(new Error("Failed to render PDF."));
    });
    return () => {
      active = false;
    };
  }, [blob, page, zoom, onError, onPageCountChange]);

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-3 text-center text-xs text-(--file-viewer-muted,#64748b)">
        Page {page} / {pageCount}
      </div>
      <canvas
        ref={canvasRef}
        className="mx-auto rounded bg-(--file-viewer-surface,#ffffff) [box-shadow:var(--file-viewer-shadow,0_1px_2px_rgb(15_23_42/0.08))]"
      />
      {pageCount === 0 && <ViewerStatus>Loading PDF...</ViewerStatus>}
    </div>
  );
}
