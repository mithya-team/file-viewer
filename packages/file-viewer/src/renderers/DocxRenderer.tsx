import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { ViewerStatus } from "../primitives/ViewerStatus";
import {
  correctDocxPreviewLayout,
  scheduleCorrectionAfterImagesLoaded,
} from "./docx/correctDocxPreviewLayout";
import {
  applyDocxDrawingLayers,
  extractDocxDrawingLayers,
  type DocxDrawingLayer,
} from "./docx/docxDrawingLayers";
import { RENDERER_VIEWPORT_CLASS } from "./rendererViewport";

export interface DocxRendererProps {
  blob: Blob;
  onError: (error: Error) => void;
}

export function DocxRenderer({ blob, onError }: DocxRendererProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const styleHostRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const host = hostRef.current;
    const styleHost = styleHostRef.current;
    if (host == null || styleHost == null) return;
    host.replaceChildren();
    styleHost.replaceChildren();
    setIsLoading(true);
    const finalizeLayout = (layers: DocxDrawingLayer[]) => {
      correctDocxPreviewLayout(host);
      applyDocxDrawingLayers(host, layers);
    };

    void Promise.all([
      renderAsync(blob, host, styleHost, {
        inWrapper: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
      }),
      extractDocxDrawingLayers(blob),
    ])
      .then(([, layers]) => {
        if (!active) return;
        finalizeLayout(layers);
        scheduleCorrectionAfterImagesLoaded(
          host,
          () => active,
          () => {
            if (active) finalizeLayout(layers);
          },
        );
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        onError(new Error("Failed to render DOCX/DOTX."));
      });
    return () => {
      active = false;
    };
  }, [blob, onError]);

  return (
    <div
      className={`${RENDERER_VIEWPORT_CLASS} p-4 [background-color:var(--file-viewer-surface-muted,_#f8fafc)]`}
    >
      {isLoading && <ViewerStatus>Rendering document...</ViewerStatus>}
      <div ref={styleHostRef} className="hidden" aria-hidden />
      <div ref={hostRef} />
    </div>
  );
}
