import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { FILE_VIEWER_SEARCH_DEBOUNCE_MS } from "@/components/file-viewer/fileViewerSearchDebounceMs";
import { renderHighlightedTextRanges } from "@/components/file-viewer/highlightTextRanges";
import type { FileViewerSearchRendererProps } from "@/components/file-viewer/fileViewerSearchTypes";
import {
  getSpreadsheetVisibleGrid,
  type SheetData,
} from "@/components/file-viewer/spreadsheetTableModel";
import {
  findSpreadsheetMatchesForSheet,
  type SpreadsheetMatch,
} from "@/components/file-viewer/spreadsheetSearchMatches";
import { useInDocumentSearch } from "@/components/file-viewer/useInDocumentSearch";

interface SpreadsheetRendererProps extends FileViewerSearchRendererProps {
  blob: Blob;
  /** "xlsx" | "xls" | "csv" */
  fileType: string;
  onReady?: () => void;
}

function matchesForCell(
  matches: SpreadsheetMatch[],
  activeSheet: number,
  area: "header" | "body",
  bodyRowIndex: number,
  colIndex: number,
): SpreadsheetMatch[] {
  return matches.filter((m) => {
    if (m.sheetIndex !== activeSheet || m.colIndex !== colIndex) return false;
    if (m.area !== area) return false;
    if (area === "body") return m.bodyRowIndex === bodyRowIndex;
    return true;
  });
}

function renderCellSearch(
  cellText: string,
  query: string,
  activeMatchIndex: number,
  cellMatches: SpreadsheetMatch[],
): ReactNode {
  if (!query.trim() || cellMatches.length === 0) return cellText;
  const segments = cellMatches.map((m) => ({
    range: { start: m.start, end: m.end },
    globalMatchIndex: m.globalIndex,
  }));
  return renderHighlightedTextRanges(cellText, segments, activeMatchIndex);
}

export function SpreadsheetRenderer({
  blob,
  fileType,
  searchQuery = "",
  activeMatchIndex = 0,
  onSearchStateChange,
  onReady,
}: SpreadsheetRendererProps) {
  const { t, i18n } = useTranslation();
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let worker: Worker | null = null;
    let active = true;

    (async () => {
      try {
        if (fileType === "csv") {
          const blobUrl = URL.createObjectURL(blob);
          worker = new Worker("/csvWorker.js");
          worker.postMessage({ fileUrl: blobUrl, maxRows: 50000 });
        } else {
          const arrayBuffer = await blob.arrayBuffer();
          worker = new Worker("/excelWorker.js");
          worker.postMessage({ arrayBuffer, type: fileType });
        }

        worker.onmessage = (e: MessageEvent) => {
          const { sheetsData, error: workerError } = e.data;
          if (!active) return;
          if (workerError) {
            setError(workerError);
            setLoading(false);
            onReady?.();
            return;
          }
          if (sheetsData) {
            setSheets(sheetsData);
            setActiveSheet(0);
            setLoading(false);
            onReady?.();
          }
        };

        worker.onerror = () => {
          if (!active) return;
          setError(
            i18n.t(
              "CONSOLE.DATASOURCES.FILE_VIEWER.ERRORS.SPREADSHEET_PROCESS_FAILED",
            ),
          );
          setLoading(false);
          onReady?.();
        };
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : i18n.t("CONSOLE.DATASOURCES.FILE_VIEWER.ERRORS.FILE_LOAD_FAILED"),
        );
        setLoading(false);
        onReady?.();
      }
    })();

    return () => {
      active = false;
      worker?.terminate();
    };
  }, [blob, fileType, i18n]);

  useEffect(() => {
    const t = debounceTimerRef.current;
    if (t !== undefined) clearTimeout(t);
    const q = searchQuery.trim();
    if (!q) {
      setDebouncedQuery("");
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, FILE_VIEWER_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current !== undefined) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const isDebouncing =
    searchQuery.trim().length > 0 && debouncedQuery !== searchQuery;

  const matches = useMemo(
    () =>
      findSpreadsheetMatchesForSheet(
        sheets[activeSheet],
        activeSheet,
        debouncedQuery,
      ),
    [sheets, activeSheet, debouncedQuery],
  );

  useInDocumentSearch({
    totalMatches: isDebouncing ? 0 : matches.length,
    isSearching: isDebouncing,
    activeMatchIndex,
    onSearchStateChange,
    scrollRootRef,
    scrollEnabled:
      !isDebouncing && matches.length > 0 && debouncedQuery.trim().length > 0,
    scrollLayoutKey: activeSheet,
  });

  const sheet = sheets[activeSheet];
  const grid = sheet
    ? getSpreadsheetVisibleGrid(sheet)
    : { kind: "empty" as const };

  const bodyRows = grid.kind === "ok" ? grid.bodyRows : [];
  const maxCols = grid.kind === "ok" ? grid.maxCols : 1;
  const columnHeaders = grid.kind === "ok" ? grid.columnHeaders : [];

  if (loading) return null;
  if (error) return <span className="text-sm text-red-600">{error}</span>;
  if (!sheets.length)
    return (
      <span className="text-sm">
        {t("CONSOLE.DATASOURCES.FILE_VIEWER.RENDERERS.NO_DATA")}
      </span>
    );
  if (grid.kind === "empty")
    return (
      <span className="text-sm">
        {t("CONSOLE.DATASOURCES.FILE_VIEWER.RENDERERS.NO_DATA")}
      </span>
    );

  const highlightQuery = debouncedQuery;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {sheet.truncated && (
        <div className="shrink-0 px-3 py-1.5 text-xs bg-yellow-50 text-yellow-700 border-b border-yellow-200">
          {t("CONSOLE.DATASOURCES.FILE_VIEWER.RENDERERS.LARGE_DATASET", {
            shown: bodyRows.length,
            total: sheet.totalRows,
          })}
        </div>
      )}

      <div
        ref={scrollRootRef}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        <Table
          containerClassName="flex-1 min-h-0 h-full overflow-auto rounded-none border-0 bg-transparent"
          className="border-collapse text-xs min-w-full"
        >
          <TableHeader className="sticky top-0 z-10 shadow-sm [&_tr]:border-b-0">
            <TableRow className="border-0 hover:bg-transparent">
              {columnHeaders.map((col, ci) => (
                <TableHead
                  key={ci}
                  className="h-auto border border-border-gray-200 bg-surface-gray-100 px-2 py-1.5 text-left font-semibold text-text-gray-700 whitespace-nowrap"
                >
                  {renderCellSearch(
                    col,
                    highlightQuery,
                    activeMatchIndex,
                    matchesForCell(matches, activeSheet, "header", 0, ci),
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bodyRows.map((row, ri) => (
              <TableRow
                key={ri}
                className={cn("border-0 hover:bg-transparent")}
              >
                {Array.from({ length: maxCols }, (_, ci) => (
                  <TableCell
                    key={ci}
                    className="border border-border-gray-200 px-2 py-1 whitespace-nowrap text-text-gray-600 max-w-[300px] overflow-hidden text-ellipsis"
                  >
                    {renderCellSearch(
                      String((row as unknown[])[ci] ?? ""),
                      highlightQuery,
                      activeMatchIndex,
                      matchesForCell(matches, activeSheet, "body", ri, ci),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {sheets.length > 1 && (
        <div
          className="flex gap-0 border-t border-border-gray-200 shrink-0 overflow-x-auto bg-surface-gray-50 [scrollbar-width:thin]"
          role="tablist"
          aria-label={t(
            "CONSOLE.DATASOURCES.FILE_VIEWER.RENDERERS.SPREADSHEET_SHEETS",
          )}
        >
          {sheets.map((s, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeSheet}
              onClick={() => setActiveSheet(i)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-r border-border-gray-200 whitespace-nowrap shrink-0",
                i === activeSheet
                  ? "bg-surface-primary-50 text-surface-primary-700"
                  : "text-text-gray-500 hover:bg-surface-gray-100",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
