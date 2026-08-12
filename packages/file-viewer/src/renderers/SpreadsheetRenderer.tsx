import { useEffect, useRef, useState } from "react";
import { ViewerStatus } from "../primitives/ViewerStatus";
import { CsvRenderer } from "./CsvRenderer";
import { RENDERER_VIEWPORT_CLASS } from "./rendererViewport";

export interface SpreadsheetRendererProps {
  blob: Blob;
  activeSheetIndex: number;
  onError: (error: Error) => void;
  onSheetNamesChange: (sheetNames: string[]) => void;
}

interface WorkbookViewerProps {
  data: ArrayBuffer;
  activeSheetIndex: number;
  onError: (error: Error) => void;
  onSheetNamesChange: (sheetNames: string[]) => void;
}

type XlsxModule = typeof import("@extend-ai/react-xlsx");

/** The primitive stays headless: FileViewer owns all workbook chrome. */
function WorkbookViewerClient({
  data,
  activeSheetIndex,
  onError,
  onSheetNamesChange,
  xlsx,
}: WorkbookViewerProps & { xlsx: XlsxModule }) {
  const controller = xlsx.useXlsxViewerController({
    file: data,
    fileName: "workbook.xlsx",
    readOnly: true,
    useWorker: true,
  });
  const lastSheetNamesRef = useRef("");

  useEffect(() => {
    if (controller.error != null) onError(controller.error);
  }, [controller.error, onError]);

  useEffect(() => {
    const sheetNames = controller.sheets.map((sheet) => sheet.name);
    const sheetKey = sheetNames.join("\u0000");
    if (sheetKey === lastSheetNamesRef.current) return;
    lastSheetNamesRef.current = sheetKey;
    onSheetNamesChange(sheetNames);
  }, [controller.revision, controller.sheets, onSheetNamesChange]);

  useEffect(() => {
    if (controller.sheets.length === 0) return;
    controller.setActiveSheetIndex(
      Math.max(0, Math.min(activeSheetIndex, controller.sheets.length - 1)),
    );
  }, [activeSheetIndex, controller.setActiveSheetIndex, controller.sheets.length]);

  return (
    <div className={`${RENDERER_VIEWPORT_CLASS} min-h-0`}>
      <xlsx.XlsxViewer
        controller={controller}
        experimentalCanvas
        readOnly
        showDefaultToolbar={false}
        showImages
      />
    </div>
  );
}

/** Loads the browser-only workbook implementation only after mount. */
function WorkbookViewer(props: WorkbookViewerProps) {
  const [xlsx, setXlsx] = useState<XlsxModule | null>(null);

  useEffect(() => {
    let disposed = false;
    void import("@extend-ai/react-xlsx").then(
      (module) => {
        if (!disposed) setXlsx(module);
      },
      (error) => {
        if (!disposed) props.onError(error instanceof Error ? error : new Error("Failed to load spreadsheet viewer."));
      },
    );
    return () => {
      disposed = true;
    };
  }, [props.onError]);

  if (xlsx == null) return <ViewerStatus>Loading spreadsheet...</ViewerStatus>;
  return <WorkbookViewerClient {...props} xlsx={xlsx} />;
}

export function SpreadsheetRenderer({ blob, activeSheetIndex, onError, onSheetNamesChange }: SpreadsheetRendererProps) {
  const isCsv = blob.type.toLowerCase().split(";", 1)[0]?.trim() === "text/csv";
  const [data, setData] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    if (isCsv) return;
    let disposed = false;
    setData(null);
    void blob.arrayBuffer().then(
      (buffer) => {
        if (!disposed) setData(buffer);
      },
      (error) => {
        if (!disposed) onError(error instanceof Error ? error : new Error("Failed to read spreadsheet."));
      },
    );
    return () => {
      disposed = true;
    };
  }, [blob, isCsv, onError]);

  if (isCsv) return <CsvRenderer blob={blob} onError={onError} />;
  if (data == null) return <ViewerStatus>Loading spreadsheet...</ViewerStatus>;
  return (
    <WorkbookViewer
      data={data}
      activeSheetIndex={activeSheetIndex}
      onError={onError}
      onSheetNamesChange={onSheetNamesChange}
    />
  );
}
