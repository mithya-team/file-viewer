import { useState } from "react";

interface PdfPageInputProps {
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
}

export function PdfPageInput({ page, pageCount, setPage }: PdfPageInputProps) {
  const [draft, setDraft] = useState(String(page));

  function commit() {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed)) {
      setPage(parsed);
      setDraft(String(Math.min(Math.max(parsed, 1), Math.max(pageCount, 1))));
    } else {
      setDraft(String(page));
    }
  }

  return (
    <input
      type="number"
      min={1}
      max={Math.max(pageCount, 1)}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
          event.currentTarget.blur();
        }
      }}
      aria-label="Page number"
      className="w-14 rounded border border-(--file-viewer-border,#cbd5e1) bg-(--file-viewer-surface,#ffffff) px-1 py-0.5 text-center text-(--file-viewer-foreground,#334155)"
    />
  );
}
