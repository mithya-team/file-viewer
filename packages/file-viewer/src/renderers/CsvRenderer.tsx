import { useEffect, useState, type ComponentType } from "react";
import "@glideapps/glide-data-grid/dist/index.css";
import { ViewerStatus } from "../primitives/ViewerStatus";
import { RENDERER_VIEWPORT_CLASS } from "./rendererViewport";

export interface CsvRendererProps {
  blob: Blob;
  onError: (error: Error) => void;
}

type CsvGridProps = {
  rows: string[][];
  onError: (error: Error) => void;
};

/**
 * The grid is intentionally loaded only after mount. Glide Data Grid touches
 * browser layout APIs while being evaluated, so importing it from the package
 * entry would make SSR imports unsafe.
 */
function CsvGrid({ rows, onError }: CsvGridProps) {
  const [grid, setGrid] = useState<{ DataEditor: ComponentType<any>; textKind: unknown } | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@glideapps/glide-data-grid")
      .then(({ DataEditor, GridCellKind }) => {
        if (mounted) setGrid({ DataEditor: DataEditor as ComponentType<any>, textKind: GridCellKind.Text });
      })
      .catch(() => {
        if (mounted) onError(new Error("Failed to load CSV viewer."));
      });
    return () => {
      mounted = false;
    };
  }, [onError]);

  if (grid == null) return <ViewerStatus>Loading CSV viewer...</ViewerStatus>;

  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columns = Array.from({ length: columnCount }, (_, index) => ({
    title: String.fromCharCode(65 + (index % 26)),
    id: `column-${index}`,
    width: 160,
  }));
  const getCellContent = ([column, row]: readonly [number, number]) => {
    const value = rows[row]?.[column] ?? "";
    return { kind: grid.textKind, data: value, displayData: value };
  };
  const DataEditor = grid.DataEditor;

  return (
    <div className={`${RENDERER_VIEWPORT_CLASS} min-h-0`}>
      <DataEditor
        columns={columns}
        rows={rows.length}
        getCellContent={getCellContent}
        width="100%"
        height="100%"
      />
    </div>
  );
}

function declaredCharset(mimeType: string): string | null {
  const match = /(?:^|;)\s*charset\s*=\s*"?([^;\s"]+)/i.exec(mimeType);
  return match?.[1]?.toLowerCase() ?? null;
}

/** Converts FileViewer's already-buffered CSV source to parser input. */
export function decodeCsvText(buffer: ArrayBuffer, mimeType = ""): string {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    // TextDecoder does not universally expose utf-16be; swap bytes first.
    const swapped = bytes.slice(2);
    for (let index = 0; index + 1 < swapped.length; index += 2) {
      const next = swapped[index];
      swapped[index] = swapped[index + 1];
      swapped[index + 1] = next;
    }
    return new TextDecoder("utf-16le").decode(swapped);
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  const charset = declaredCharset(mimeType);
  if (charset != null) {
    return new TextDecoder(charset, { fatal: true }).decode(bytes);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function CsvRenderer({ blob, onError }: CsvRendererProps) {
  const [rows, setRows] = useState<string[][] | null>(null);

  useEffect(() => {
    let mounted = true;
    setRows(null);
    blob
      .arrayBuffer()
      .then((buffer) => decodeCsvText(buffer, blob.type))
      .then((text) => import("papaparse").then(({ default: Papa }) => {
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
        if (parsed.errors.length > 0) throw new Error(parsed.errors[0].message);
        return parsed.data;
      }))
      .then((nextRows) => {
        if (mounted) setRows(nextRows);
      })
      .catch((error) => {
        if (mounted) onError(error instanceof Error ? error : new Error("Failed to parse CSV."));
      });
    return () => {
      mounted = false;
    };
  }, [blob, onError]);

  if (rows == null) return <ViewerStatus>Loading CSV...</ViewerStatus>;
  return <CsvGrid rows={rows} onError={onError} />;
}
