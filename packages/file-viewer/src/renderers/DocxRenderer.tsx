import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { ViewerStatus } from "../primitives/ViewerStatus";

interface DocxRendererProps {
  blob: Blob;
  onError: (error: Error) => void;
}

export function DocxRenderer({ blob, onError }: DocxRendererProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const host = hostRef.current;
    if (host == null) return;
    host.replaceChildren();
    setIsLoading(true);
    void renderAsync(blob, host, undefined, {
      inWrapper: true,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
    })
      .then(() => {
        if (!active) return;
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
    <div className="h-full overflow-auto p-4 [background-color:var(--file-viewer-surface-muted,_#f8fafc)]">
      {isLoading && <ViewerStatus>Rendering document...</ViewerStatus>}
      <div ref={hostRef} />
    </div>
  );
}
