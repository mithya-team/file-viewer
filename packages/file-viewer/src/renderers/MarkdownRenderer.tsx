import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { ViewerStatus } from "../primitives/ViewerStatus";
import { RENDERER_VIEWPORT_CLASS } from "./rendererViewport";

export interface MarkdownRendererProps {
  blob: Blob;
  onError: (error: Error) => void;
}

async function readMarkdownContent(blob: Blob) {
  return blob.text();
}

const MARKDOWN_BODY_CLASS = [
  "max-w-none text-sm leading-relaxed [color:var(--file-viewer-foreground,_#334155)]",
  "[&_h1]:mb-3 [&_h1]:mt-0 [&_h1]:text-2xl [&_h1]:font-semibold",
  "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold",
  "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_p]:my-2",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:my-0.5",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-(--file-viewer-border,#cbd5e1) [&_blockquote]:pl-3 [&_blockquote]:italic",
  "[&_code]:rounded [&_code]:bg-(--file-viewer-surface-muted,#f8fafc) [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:border [&_pre]:border-(--file-viewer-border,#cbd5e1) [&_pre]:bg-(--file-viewer-surface-muted,#f8fafc) [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a]:text-(--file-viewer-accent,#2563eb) [&_a]:underline",
  "[&_hr]:my-4 [&_hr]:border-(--file-viewer-border,#cbd5e1)",
  "[&_table]:w-full [&_table]:border-collapse [&_table]:text-left",
  "[&_th]:border [&_th]:border-(--file-viewer-border,#cbd5e1) [&_th]:bg-(--file-viewer-surface-muted,#f8fafc) [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold",
  "[&_td]:border [&_td]:border-(--file-viewer-border,#cbd5e1) [&_td]:px-2 [&_td]:py-1",
  "[&_img]:my-3 [&_img]:max-w-full",
].join(" ");

export function MarkdownRenderer({ blob, onError }: MarkdownRendererProps) {
  const [value, setValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void readMarkdownContent(blob)
      .then((text) => {
        if (!active) return;
        setValue(text);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        onError(new Error("Failed to parse markdown content."));
      });
    return () => {
      active = false;
    };
  }, [blob, onError]);

  return (
    <div className={`${RENDERER_VIEWPORT_CLASS} p-4`} data-renderer="markdown">
      {isLoading ? (
        <ViewerStatus>Loading markdown...</ViewerStatus>
      ) : (
        <div className={MARKDOWN_BODY_CLASS}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              a: ({ href, children, ...rest }) => (
                <a {...rest} href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              table: ({ children, ...rest }) => (
                <div className="my-3 overflow-x-auto">
                  <table {...rest}>{children}</table>
                </div>
              ),
            }}
          >
            {value}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
