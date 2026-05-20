import { RENDERER_VIEWPORT_CLASS } from "./rendererViewport";

interface ImageRendererProps {
  objectUrl: string;
  onError: (error: Error) => void;
}

export function ImageRenderer({ objectUrl, onError }: ImageRendererProps) {
  return (
    <div
      className={`${RENDERER_VIEWPORT_CLASS} flex items-center justify-center p-4 bg-(--file-viewer-surface-muted,#f8fafc)`}
    >
      <img
        src={objectUrl}
        alt="Rendered file"
        className="max-h-full max-w-full rounded [box-shadow:var(--file-viewer-shadow,0_1px_2px_rgb(15_23_42/0.08))]"
        onError={() => onError(new Error("Failed to render image."))}
      />
    </div>
  );
}
