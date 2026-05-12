import { useEffect, useState } from "react";

interface TextRendererProps {
  blob: Blob;
}

export function TextRenderer({ blob }: TextRendererProps) {
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    blob
      .text()
      .then((text) => {
        if (!active) return;
        setValue(text);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError("Failed to parse text content.");
      });
    return () => {
      active = false;
    };
  }, [blob]);

  if (error != null) {
    return <div className="p-4 text-sm text-red-600">{error}</div>;
  }
  return (
    <div className="h-full overflow-auto p-4">
      <pre className="whitespace-pre-wrap break-words font-mono text-sm text-slate-700">{value}</pre>
    </div>
  );
}
