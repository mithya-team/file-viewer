import { useEffect, useState } from "react";
import { RENDERER_VIEWPORT_CLASS } from "./rendererViewport";

export interface HtmlRendererProps {
  blob: Blob;
  onError: (error: Error) => void;
}

export function HtmlRenderer({ blob, onError }: HtmlRendererProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string;
    try {
      url = URL.createObjectURL(blob);
    } catch {
      onError(new Error("Failed to create HTML preview URL."));
      return;
    }
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob, onError]);

  if (objectUrl == null) {
    return null;
  }

  return (
    <div className={RENDERER_VIEWPORT_CLASS} data-renderer="html">
      <iframe
        title="HTML preview"
        src={objectUrl}
        sandbox="allow-scripts"
        className="h-full w-full border-0 bg-white"
      />
    </div>
  );
}
