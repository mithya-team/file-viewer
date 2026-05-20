import { describe, expect, it } from "vitest";
import { loadSourceToBlob } from "../src/source/loadSourceToBlob";

describe("loadSourceToBlob", () => {
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
});
