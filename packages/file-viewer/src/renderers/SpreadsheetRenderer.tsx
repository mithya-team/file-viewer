import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface SpreadsheetRendererProps {
  blob: Blob;
}

type SheetData = {
  name: string;
  rows: string[][];
};

export function SpreadsheetRenderer({ blob }: SpreadsheetRendererProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    blob
      .arrayBuffer()
      .then((buffer) => {
        if (!active) return;
        const workbook = XLSX.read(buffer, { type: "array" });
        const nextSheets = workbook.SheetNames.map((name) => {
          const worksheet = workbook.Sheets[name];
          const rawRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
            header: 1,
            blankrows: false,
          });
          const rows = rawRows.map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
          return { name, rows };
        });
        setSheets(nextSheets);
        setActiveSheetIndex(0);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError("Failed to parse spreadsheet.");
      });
    return () => {
      active = false;
    };
  }, [blob]);

  if (error != null) return <div className="p-4 text-sm text-red-600">{error}</div>;
  if (sheets.length === 0) return <div className="p-4 text-sm text-slate-500">No spreadsheet rows.</div>;

  const activeSheet = sheets[Math.min(activeSheetIndex, sheets.length - 1)];
  const maxColumns = activeSheet.rows.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        {sheets.map((sheet, index) => (
          <button
            key={sheet.name}
            type="button"
            onClick={() => setActiveSheetIndex(index)}
            className={`rounded border px-2 py-1 text-xs ${
              index === activeSheetIndex ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {sheet.name}
          </button>
        ))}
      </div>
      <div className="h-full overflow-auto p-3">
        <table className="w-full border-collapse text-left text-xs">
          <tbody>
            {activeSheet.rows.map((row, rowIndex) => (
              <tr key={`${activeSheet.name}-${rowIndex}`}>
                {Array.from({ length: maxColumns }, (_, colIndex) => (
                  <td key={colIndex} className="border border-slate-200 px-2 py-1 align-top text-slate-700">
                    {row[colIndex] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
