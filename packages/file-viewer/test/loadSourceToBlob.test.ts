import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSourceToBlob } from "../src/source/loadSourceToBlob";

describe("loadSourceToBlob", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads base64 strings into blobs", async () => {
    const blob = await loadSourceToBlob("SGVsbG8=", new AbortController().signal);
    expect(await blob.text()).toBe("Hello");
  });

  it("serializes overlapping reads on the same stream", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([65]));
        controller.close();
      },
    });

    await expect(
      Promise.all([
        loadSourceToBlob(stream, new AbortController().signal),
        loadSourceToBlob(stream, new AbortController().signal),
      ]),
    ).resolves.toBeDefined();
  });

  it("rejects when the load signal is already aborted", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([65]));
        controller.close();
      },
    });
    const abortController = new AbortController();
    abortController.abort();

    await expect(loadSourceToBlob(stream, abortController.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("keeps an HTTP request alive across a same-turn abort and retry", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));
    vi.stubGlobal("fetch", fetchMock);

    const firstController = new AbortController();
    const replacementController = new AbortController();
    const firstLoad = loadSourceToBlob("http://example.test/document.pdf", firstController.signal);

    firstController.abort();
    const replacementLoad = loadSourceToBlob(
      "http://example.test/document.pdf",
      replacementController.signal,
    );
    resolveFetch?.(new Response("PDF", { status: 200 }));

    await expect(firstLoad).rejects.toMatchObject({ name: "AbortError" });
    await expect(replacementLoad).resolves.toMatchObject({ size: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
