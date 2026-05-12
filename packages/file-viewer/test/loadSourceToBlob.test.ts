import { describe, expect, it } from "vitest";
import { loadSourceToBlob } from "../src/source/loadSourceToBlob";

describe("loadSourceToBlob", () => {
  it("loads base64 strings into blobs", async () => {
    const blob = await loadSourceToBlob("SGVsbG8=", new AbortController().signal);
    expect(await blob.text()).toBe("Hello");
  });

  it("cancels stale stream reads on abort", async () => {
    let cancelCalled = false;
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelCalled = true;
      },
    });
    const abortController = new AbortController();
    const loadPromise = loadSourceToBlob(stream, abortController.signal);

    abortController.abort();

    await expect(loadPromise).rejects.toMatchObject({ name: "AbortError" });
    expect(cancelCalled).toBe(true);
  });
});
