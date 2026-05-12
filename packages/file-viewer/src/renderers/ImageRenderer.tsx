interface ImageRendererProps {
  objectUrl: string;
}

export function ImageRenderer({ objectUrl }: ImageRendererProps) {
  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-slate-50 p-4">
      <img src={objectUrl} alt="Rendered file" className="max-h-full max-w-full rounded shadow-sm" />
    </div>
  );
}
