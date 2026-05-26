/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { ImageRenderer } from "../src/renderers/ImageRenderer";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const pointerEvent = {
  pointerId: 1,
  button: 0,
  clientX: 0,
  clientY: 0,
  stopPropagation: () => undefined,
  currentTarget: { hasPointerCapture: () => false, releasePointerCapture: () => undefined },
};

describe("ImageRenderer", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    if (renderer != null) {
      await act(async () => {
        renderer?.unmount();
      });
    }
    renderer = undefined;
    vi.useRealTimers();
  });

  it("steps zoom immediately on pointer up", async () => {
    const onStepZoom = vi.fn();
    const onResetZoom = vi.fn();

    await act(async () => {
      renderer = create(
        <ImageRenderer
          objectUrl="blob:test"
          zoom={100}
          onError={() => undefined}
          onStepZoom={onStepZoom}
          onResetZoom={onResetZoom}
        />,
      );
    });

    const image = renderer?.root.findByType("img");
    await act(async () => {
      image?.props.onPointerDown(pointerEvent);
      image?.props.onPointerUp(pointerEvent);
    });

    expect(onStepZoom).toHaveBeenCalledTimes(1);
    expect(onResetZoom).not.toHaveBeenCalled();
  });

  it("resets zoom on double pointer up", async () => {
    vi.useFakeTimers();
    const onStepZoom = vi.fn();
    const onResetZoom = vi.fn();

    await act(async () => {
      renderer = create(
        <ImageRenderer
          objectUrl="blob:test"
          zoom={175}
          onError={() => undefined}
          onStepZoom={onStepZoom}
          onResetZoom={onResetZoom}
        />,
      );
    });

    const image = renderer?.root.findByType("img");

    await act(async () => {
      image?.props.onPointerDown(pointerEvent);
      image?.props.onPointerUp(pointerEvent);
      vi.advanceTimersByTime(50);
      image?.props.onPointerDown(pointerEvent);
      image?.props.onPointerUp(pointerEvent);
    });

    expect(onResetZoom).toHaveBeenCalledTimes(1);
    expect(onStepZoom).toHaveBeenCalledTimes(1);
  });

  it("uses zoom-in cursor at fit zoom", async () => {
    await act(async () => {
      renderer = create(
        <ImageRenderer
          objectUrl="blob:test"
          zoom={100}
          onError={() => undefined}
          onStepZoom={() => undefined}
          onResetZoom={() => undefined}
        />,
      );
    });

    const image = renderer?.root.findByType("img");
    expect(image?.props.className).toContain("cursor-zoom-in");
    expect(image?.props.className).not.toContain("cursor-grab");
  });
});
