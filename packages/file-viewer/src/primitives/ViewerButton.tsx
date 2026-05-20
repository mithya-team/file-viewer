import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ViewerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function ViewerButton({ active = false, children, className, type = "button", ...props }: ViewerButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex cursor-pointer items-center justify-center rounded border px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "[border-color:var(--file-viewer-border-strong,_#94a3b8)] [background-color:var(--file-viewer-surface-muted,_#f8fafc)] [color:var(--file-viewer-foreground-strong,_#0f172a)]"
          : "[border-color:var(--file-viewer-border,_#cbd5e1)] [background-color:var(--file-viewer-surface,_#ffffff)] [color:var(--file-viewer-foreground,_#334155)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
