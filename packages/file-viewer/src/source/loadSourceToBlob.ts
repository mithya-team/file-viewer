import type { FileViewerSource } from "../types";
import { classifyStringSource } from "./classifyStringSource";

function decodeBase64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/\s/g, "");
  const binary = atob(normalized);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    out[index] = binary.charCodeAt(index);
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function loadStringSource(value: string, signal: AbortSignal): Promise<Blob> {
  const kind = classifyStringSource(value);
  switch (kind) {
    case "data-url":
    case "object-url":
    case "http-url": {
      const response = await fetch(value, { signal });
      if (!response.ok) {
        throw new Error(`Failed to load source URL (${response.status}).`);
      }
      return response.blob();
    }
    case "base64":
      return new Blob([toArrayBuffer(decodeBase64ToBytes(value))]);
    default: {
      const exhaustiveCheck: never = kind;
      throw new Error(`Unsupported string kind: ${String(exhaustiveCheck)}`);
    }
  }
}

async function loadStreamSource(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): Promise<Blob> {
  const reader = stream.getReader();
  const chunks: ArrayBuffer[] = [];
  const abortRead = () => {
    void reader.cancel(signal.reason).catch(() => undefined);
  };
  try {
    if (signal.aborted) {
      abortRead();
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    signal.addEventListener("abort", abortRead, { once: true });
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      if (done) break;
      if (value != null) {
        chunks.push(toArrayBuffer(value));
      }
    }
  } finally {
    signal.removeEventListener("abort", abortRead);
    reader.releaseLock();
  }
  return new Blob(chunks);
}

export async function loadSourceToBlob(
  source: FileViewerSource,
  signal: AbortSignal,
): Promise<Blob> {
  if (source instanceof Blob) return source;
  if (typeof source === "string") return loadStringSource(source, signal);
  return loadStreamSource(source, signal);
}
