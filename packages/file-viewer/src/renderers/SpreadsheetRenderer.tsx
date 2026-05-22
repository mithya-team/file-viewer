import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { ViewerStatus } from "../primitives/ViewerStatus";
import { RENDERER_VIEWPORT_CLASS } from "./rendererViewport";

export interface SpreadsheetRendererProps {
  blob: Blob;
  activeSheetIndex: number;
  onError: (error: Error) => void;
  onSheetNamesChange: (sheetNames: string[]) => void;
}

type SheetData = {
  name: string;
  rows: string[][];
};

function parseWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames.map((name) => {
    const worksheet = workbook.Sheets[name];
    const rawRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
      header: 1,
      blankrows: false,
    });
    const rows = rawRows.map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
    return { name, rows };
  });
}

export function SpreadsheetRenderer({
  blob,
  activeSheetIndex,
  onError,
  onSheetNamesChange,
}: SpreadsheetRendererProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);

  useEffect(() => {
    let active = true;
    blob
      .arrayBuffer()
      .then((buffer) => {
        if (!active) return;
        const nextSheets = parseWorkbook(buffer);
        setSheets(nextSheets);
        onSheetNamesChange(nextSheets.map((sheet) => sheet.name));
      })
      .catch(() => {
        if (!active) return;
        onSheetNamesChange([]);
        onError(new Error("Failed to parse spreadsheet."));
      });
    return () => {
      active = false;
    };
  }, [blob, onError, onSheetNamesChange]);

  if (sheets.length === 0) return <ViewerStatus>Loading spreadsheet...</ViewerStatus>;

  const activeSheet = sheets[Math.min(activeSheetIndex, sheets.length - 1)];
  const maxColumns = activeSheet.rows.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div className={`${RENDERER_VIEWPORT_CLASS} p-3`}>
      <table className="w-full border-collapse text-left text-xs">
        <tbody>
          {activeSheet.rows.map((row, rowIndex) => (
            <tr key={`${activeSheet.name}-${rowIndex}`}>
              {Array.from({ length: maxColumns }, (_, colIndex) => (
                <td
                  key={colIndex}
                  className="border px-2 py-1 align-top [border-color:var(--file-viewer-border,_#cbd5e1)] [color:var(--file-viewer-foreground,_#334155)]"
                >
                  {row[colIndex] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
