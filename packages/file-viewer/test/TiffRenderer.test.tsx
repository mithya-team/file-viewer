/**
 * @vitest-environment happy-dom
 */
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { TiffRenderer } from "../src/renderers/TiffRenderer";
import { createMinimalTiffBuffer, createTwoPageTiffBuffer } from "./tiffTestFixtures";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const OBSERVER_MARGIN = 600;

const decodeTiffPageToPngBlobMock = vi.hoisted(() =>
  vi.fn(async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" })),
);

vi.mock("../src/image/tiffDecode", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/image/tiffDecode")>();
  return {
    ...original,
    decodeTiffPageToPngBlob: decodeTiffPageToPngBlobMock,
  };
});

const { lazyObservers, visibleObservers, createObjectURLSpy, revokeObjectURLSpy } = vi.hoisted(() => {
  const lazyObservers: Array<{
    callback: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
  }> = [];
  const visibleObservers: Array<{
    callback: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
  }> = [];

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];

    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      const entry = { callback, options };
      if (options?.rootMargin?.includes(`${OBSERVER_MARGIN}`)) {
        lazyObservers.push(entry);
      } else {
        visibleObservers.push(entry);
      }
    }

    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }

  globalThis.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;

  const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");
  const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

  return { lazyObservers, visibleObservers, createObjectURLSpy, revokeObjectURLSpy };
});

function createIntersectionTarget(pageNum: number) {
  return {
    dataset: { pageNum: String(pageNum) },
    getBoundingClientRect: () => ({
      top: 0,
      bottom: 100,
      left: 0,
      right: 100,
    }),
  };
}

function triggerLazyIntersection(pageNum: number) {
  const lazyObserver = lazyObservers.at(-1);
  lazyObserver?.callback(
    [
      {
        isIntersecting: true,
        target: createIntersectionTarget(pageNum),
        intersectionRatio: 1,
      } as unknown as IntersectionObserverEntry,
    ],
    lazyObserver as unknown as IntersectionObserver,
  );
}

function triggerVisiblePage(pageNum: number) {
  const visibleObserver = visibleObservers.at(-1);
  visibleObserver?.callback(
    [
      {
        isIntersecting: true,
        target: createIntersectionTarget(pageNum),
        intersectionRatio: 0.9,
      } as unknown as IntersectionObserverEntry,
    ],
    visibleObserver as unknown as IntersectionObserver,
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function waitFor<T>(read: () => T | null, attempts = 40): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = read();
    if (value != null) return value;
    await flush();
  }
  throw new Error("Timed out waiting for value.");
}

function defaultProps(overrides: Partial<Parameters<typeof TiffRenderer>[0]> = {}) {
  return {
    blob: new Blob([createMinimalTiffBuffer()], { type: "image/tiff" }),
    page: 1,
    zoom: 100,
    onError: vi.fn(),
    onPageCountChange: vi.fn(),
    ...overrides,
  };
}

describe("TiffRenderer", () => {
  let renderer: ReactTestRenderer | undefined;
  const pageSlotHosts = new Map<number, { dataset: { pageNum: string } }>();

  beforeEach(() => {
    pageSlotHosts.clear();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    lazyObservers.length = 0;
    visibleObservers.length = 0;
    decodeTiffPageToPngBlobMock.mockClear();
    decodeTiffPageToPngBlobMock.mockResolvedValue(
      new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }),
    );
    createObjectURLSpy.mockImplementation(() => "blob:tiff-page");
    revokeObjectURLSpy.mockImplementation(() => {});
  });

  afterEach(async () => {
    if (renderer != null) {
      await act(async () => {
        renderer?.unmount();
      });
    }
    renderer = undefined;
    lazyObservers.length = 0;
    visibleObservers.length = 0;
    createObjectURLSpy.mockReset();
    revokeObjectURLSpy.mockReset();
  });

  async function renderTiff(element: ReactElement) {
    await act(async () => {
      renderer = create(element, {
        createNodeMock: (node) => {
          const props = node.props as Record<string, unknown>;
          if (node.type === "div") {
            const pageNum = props["data-page-num"];
            if (pageNum != null) {
              const host = {
                dataset: { pageNum: String(pageNum) },
                getBoundingClientRect: () => ({
                  top: 0,
                  bottom: 100,
                  left: 0,
                  right: 100,
                }),
              };
              pageSlotHosts.set(Number(pageNum), host);
              return host;
            }
            const className = props.className as string | undefined;
            if (className?.includes("bg-transparent")) {
              const scrollHost = {
                scrollTop: 0,
                scrollTo: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                getBoundingClientRect: () => ({
                  top: 0,
                  bottom: 200,
                  left: 0,
                  right: 200,
                }),
                querySelector: (selector: string) => {
                  const match = selector.match(/data-page-num="(\d+)"/);
                  if (match == null) return null;
                  return pageSlotHosts.get(Number(match[1])) ?? null;
                },
                querySelectorAll: () => Array.from(pageSlotHosts.values()),
              };
              const ref = props.ref as
                | ((instance: typeof scrollHost | null) => void)
                | { current?: typeof scrollHost | null }
                | null;
              if (typeof ref === "function") {
                ref(scrollHost);
              } else if (ref != null) {
                ref.current = scrollHost;
              }
              return scrollHost;
            }
          }
          return {};
        },
      });
    });
    return renderer!;
  }

  it("reports page count after load", async () => {
    const onPageCountChange = vi.fn();
    const blob = new Blob([createTwoPageTiffBuffer()], { type: "image/tiff" });
    await renderTiff(<TiffRenderer {...defaultProps({ blob, onPageCountChange })} />);

    await waitFor(() => (onPageCountChange.mock.calls.length > 0 ? true : null));

    expect(onPageCountChange).toHaveBeenCalledWith(2);
    expect(renderer?.root.findAllByProps({ "data-page-num": 1 }).length).toBeGreaterThan(0);
    expect(renderer?.root.findAllByProps({ "data-page-num": 2 }).length).toBeGreaterThan(0);
  });

  it("lazy-decodes when a page enters the viewport", async () => {
    await renderTiff(<TiffRenderer {...defaultProps()} />);

    await waitFor(() => (lazyObservers.length > 0 ? lazyObservers : null));

    const callsBefore = decodeTiffPageToPngBlobMock.mock.calls.length;

    await act(async () => {
      triggerLazyIntersection(1);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(decodeTiffPageToPngBlobMock.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(createObjectURLSpy.mock.calls.length).toBeGreaterThan(0);
  });

  it("reuses cached display URL when page is viewed again", async () => {
    await renderTiff(<TiffRenderer {...defaultProps()} />);

    await waitFor(() => (lazyObservers.length > 0 ? lazyObservers : null));

    await act(async () => {
      triggerLazyIntersection(1);
      await Promise.resolve();
      await Promise.resolve();
    });

    const decodeCallsAfterFirst = decodeTiffPageToPngBlobMock.mock.calls.length;
    const urlCallsAfterFirst = createObjectURLSpy.mock.calls.length;

    await act(async () => {
      triggerLazyIntersection(1);
      await Promise.resolve();
    });

    expect(decodeTiffPageToPngBlobMock.mock.calls.length).toBe(decodeCallsAfterFirst);
    expect(createObjectURLSpy.mock.calls.length).toBe(urlCallsAfterFirst);
  });

  it("reports visible page from scroll observer", async () => {
    const onVisiblePageChange = vi.fn();
    const blob = new Blob([createTwoPageTiffBuffer()], { type: "image/tiff" });
    await renderTiff(
      <TiffRenderer {...defaultProps({ blob, onVisiblePageChange })} />,
    );

    await waitFor(() => (visibleObservers.length > 0 ? visibleObservers : null));

    await act(async () => {
      triggerVisiblePage(2);
    });

    expect(onVisiblePageChange).toHaveBeenCalledWith(2);
  });

  it("revokes display URLs on unmount", async () => {
    await renderTiff(<TiffRenderer {...defaultProps()} />);

    await waitFor(() => (lazyObservers.length > 0 ? lazyObservers : null));

    await act(async () => {
      triggerLazyIntersection(1);
      await Promise.resolve();
      await Promise.resolve();
    });

    const revokeCallsBefore = revokeObjectURLSpy.mock.calls.length;

    await act(async () => {
      renderer?.unmount();
    });

    expect(revokeObjectURLSpy.mock.calls.length).toBeGreaterThan(revokeCallsBefore);
  });
});
