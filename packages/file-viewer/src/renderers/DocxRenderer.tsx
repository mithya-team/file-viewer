import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

interface DocxRendererProps {
  blob: Blob;
}

export function DocxRenderer({ blob }: DocxRendererProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const host = hostRef.current;
    if (host == null) return;
    host.replaceChildren();
    void renderAsync(blob, host, undefined, {
      inWrapper: true,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
    })
      .then(() => {
        if (!active) return;
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError("Failed to render DOCX/DOTX.");
      });
    return () => {
      active = false;
    };
  }, [blob]);

  if (error != null) {
    return <div className="p-4 text-sm text-red-600">{error}</div>;
  }
  return (
    <div className="h-full overflow-auto bg-slate-50 p-4">
      <div ref={hostRef} />
    </div>
  );
}
