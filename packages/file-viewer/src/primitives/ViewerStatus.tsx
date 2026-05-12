import type { ReactNode } from "react";

interface ViewerStatusProps {
  children: ReactNode;
  centered?: boolean;
  tone?: "default" | "error";
}

export function ViewerStatus({ children, centered = false, tone = "default" }: ViewerStatusProps) {
  const toneClass =
    tone === "error"
      ? "[color:var(--file-viewer-danger,_#dc2626)]"
      : "[color:var(--file-viewer-muted,_#64748b)]";

  return (
    <div
      className={[
        "text-sm",
        toneClass,
        centered ? "flex h-full items-center justify-center p-6 text-center" : "p-4",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
