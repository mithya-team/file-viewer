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

function createAbortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

type SharedUrlLoad = {
  abortController: AbortController;
  consumers: number;
  promise: Promise<Blob>;
  settled: boolean;
};

/**
 * React development Strict Mode temporarily tears down URL consumers before
 * mounting their replacement. Keep one in-flight read per URL through that
 * same turn so the cleanup cannot cancel the replacement's source request.
 */
const sharedUrlLoads = new Map<string, SharedUrlLoad>();

function createSharedUrlLoad(value: string): SharedUrlLoad {
  const abortController = new AbortController();
  const shared: SharedUrlLoad = {
    abortController,
    consumers: 0,
    promise: Promise.resolve(new Blob()),
    settled: false,
  };

  shared.promise = fetch(value, { signal: abortController.signal }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load source URL (${response.status}).`);
    }
    return response.blob();
  });
  void shared.promise.then(
    () => {
      shared.settled = true;
      if (sharedUrlLoads.get(value) === shared) sharedUrlLoads.delete(value);
    },
    () => {
      shared.settled = true;
      if (sharedUrlLoads.get(value) === shared) sharedUrlLoads.delete(value);
    },
  );
  sharedUrlLoads.set(value, shared);
  return shared;
}

function getSharedUrlLoad(value: string): SharedUrlLoad {
  const existing = sharedUrlLoads.get(value);
  if (existing != null && !existing.abortController.signal.aborted) return existing;
  return createSharedUrlLoad(value);
}

function loadSharedUrlSource(value: string, signal: AbortSignal): Promise<Blob> {
  if (signal.aborted) return Promise.reject(createAbortError());

  const shared = getSharedUrlLoad(value);
  shared.consumers += 1;

  return new Promise<Blob>((resolve, reject) => {
    let finished = false;

    const release = () => {
      shared.consumers = Math.max(0, shared.consumers - 1);
      if (shared.consumers !== 0 || shared.settled) return;
      queueMicrotask(() => {
        if (shared.consumers === 0 && !shared.settled) {
          shared.abortController.abort();
        }
      });
    };

    const finish = (callback: () => void) => {
      if (finished) return;
      finished = true;
      signal.removeEventListener("abort", onAbort);
      release();
      callback();
    };

    const onAbort = () => {
      finish(() => reject(createAbortError()));
    };

    signal.addEventListener("abort", onAbort, { once: true });
    shared.promise.then(
      (blob) => finish(() => resolve(blob)),
      (error) => finish(() => reject(error)),
    );
  });
}

async function loadStringSource(value: string, signal: AbortSignal): Promise<Blob> {
  const kind = classifyStringSource(value);
  switch (kind) {
    case "data-url":
    case "object-url":
    case "http-url":
      return loadSharedUrlSource(value, signal);
    case "base64":
      return new Blob([toArrayBuffer(decodeBase64ToBytes(value))]);
    default: {
      const exhaustiveCheck: never = kind;
      throw new Error(`Unsupported string kind: ${String(exhaustiveCheck)}`);
    }
  }
}

/**
 * Streams are single-use. Reuse one in-flight/completed blob read per stream instance
 * (e.g. React Strict Mode remount) instead of calling getReader() again on a drained stream.
 */
const streamBlobLoads = new WeakMap<ReadableStream<Uint8Array>, Promise<Blob>>();

async function readStreamToBlob(stream: ReadableStream<Uint8Array>): Promise<Blob> {
  const reader = stream.getReader();
  const chunks: ArrayBuffer[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value != null) {
        chunks.push(toArrayBuffer(value));
      }
    }
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks);
}

async function loadStreamSource(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): Promise<Blob> {
  if (signal.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  let shared = streamBlobLoads.get(stream);
  if (shared == null) {
    shared = readStreamToBlob(stream);
    streamBlobLoads.set(stream, shared);
    void shared.catch(() => {
      streamBlobLoads.delete(stream);
    });
  }

  return shared;
}

export async function loadSourceToBlob(
  source: FileViewerSource,
  signal: AbortSignal,
): Promise<Blob> {
  if (source instanceof Blob) return source;
  if (typeof source === "string") return loadStringSource(source, signal);
  return loadStreamSource(source, signal);
}
