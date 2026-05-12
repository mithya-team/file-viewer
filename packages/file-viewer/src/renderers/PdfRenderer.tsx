import { useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";

interface PdfRendererProps {
  blob: Blob;
}

if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
}

export function PdfRenderer({ blob }: PdfRendererProps) {
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const data = await blob.arrayBuffer();
        const loadingTask = getDocument({ data });
        const document = await loadingTask.promise;
        if (!active) {
          await document.destroy();
          return;
        }
        setPages(document.numPages);
        const clampedPage = Math.min(page, document.numPages);
        const pdfPage = await document.getPage(clampedPage);
        const viewport = pdfPage.getViewport({ scale: zoom / 100 });
        const canvas = canvasRef.current;
        if (canvas == null) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (context == null) return;
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        await document.destroy();
        setError(null);
      } catch {
        if (!active) return;
        setError("Failed to render PDF.");
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [blob, page, zoom]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs">
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
          onClick={() => setPage((old) => Math.max(old - 1, 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span className="min-w-20 text-center">
          Page {page} / {pages}
        </span>
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
          onClick={() => setPage((old) => Math.min(old + 1, pages))}
          disabled={page >= pages}
        >
          Next
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-1"
            onClick={() => setZoom((old) => Math.max(old - 10, 40))}
          >
            -
          </button>
          <span>{zoom}%</span>
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-1"
            onClick={() => setZoom((old) => Math.min(old + 10, 300))}
          >
            +
          </button>
        </div>
      </div>
      <div className="h-full overflow-auto p-4">
        {error != null ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <canvas ref={canvasRef} className="mx-auto rounded bg-white shadow-sm" />
        )}
      </div>
    </div>
  );
}
