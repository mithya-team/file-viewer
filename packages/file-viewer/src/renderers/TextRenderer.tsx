import { useEffect, useState } from "react";
import { ViewerStatus } from "../primitives/ViewerStatus";
import { RENDERER_VIEWPORT_CLASS } from "./rendererViewport";

export interface TextRendererProps {
  blob: Blob;
  onError: (error: Error) => void;
}

async function readTextContent(blob: Blob) {
  return blob.text();
}

export function TextRenderer({ blob, onError }: TextRendererProps) {
  const [value, setValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void readTextContent(blob)
      .then((text) => {
        if (!active) return;
        setValue(text);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        onError(new Error("Failed to parse text content."));
      });
    return () => {
      active = false;
    };
  }, [blob, onError]);

  return (
    <div className={`${RENDERER_VIEWPORT_CLASS} p-4`}>
      {isLoading ? (
        <ViewerStatus>Loading text...</ViewerStatus>
      ) : (
        <pre className="whitespace-pre-wrap wrap-break-word font-mono text-sm [color:var(--file-viewer-foreground,_#334155)]">
          {value}
        </pre>
      )}
    </div>
  );
}
