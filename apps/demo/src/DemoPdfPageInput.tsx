import { useEffect, useRef, useState } from "react";

interface DemoPdfPageInputProps {
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  documentKey?: string;
  initialPage?: number;
}

export function DemoPdfPageInput({
  page,
  pageCount,
  setPage,
  documentKey,
  initialPage,
}: DemoPdfPageInputProps) {
  const [draft, setDraft] = useState(
    () => String(initialPage ?? page),
  );
  const appliedForRef = useRef<{ documentKey: string; pageCount: number } | null>(
    null,
  );

  useEffect(() => {
    if (initialPage == null || documentKey == null) return;
    if (pageCount < 1) return;

    const applied = appliedForRef.current;
    if (
      applied?.documentKey === documentKey
      && applied.pageCount === pageCount
    ) {
      return;
    }

    appliedForRef.current = { documentKey, pageCount };
    const target = Math.min(
      Math.max(initialPage, 1),
      Math.max(pageCount, 1),
    );
    setPage(target);
    setDraft(String(target));
  }, [documentKey, initialPage, pageCount, setPage]);

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
    <div className="flex items-center gap-1">
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
        className="w-14 rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-center text-slate-100"
      />
      <button
        type="button"
        onClick={commit}
        className="cursor-pointer rounded border border-slate-600 px-2 py-1 text-slate-100 transition hover:border-slate-400"
      >
        Go
      </button>
    </div>
  );
}
