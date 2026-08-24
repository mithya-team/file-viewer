import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

const { pptxViewerState } = vi.hoisted(() => ({
  pptxViewerState: { props: null as Record<string, any> | null },
}));

vi.mock("@extend-ai/react-pptx", () => ({
  ReactPptxViewer: (props: Record<string, any>) => {
    pptxViewerState.props = props;
    return null;
  },
}));

import {
  readZipEntries,
  writeZipEntries,
} from "../src/renderers/office/officeZipArchive";
import { PptxRenderer } from "../src/renderers/PptxRenderer";

function pptxBlobWithEncodedBullet(): Blob {
  const xml = new TextEncoder().encode('<a:pPr><a:buChar char="&#x2022;"/></a:pPr>');
  const buffer = writeZipEntries([{ name: "ppt/slides/slide1.xml", bytes: xml }]);
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

function createController() {
  return {
    // `onReady` is the library's readiness signal. The adapter must not
    // discard a FileViewer chrome command by independently polling this
    // optional controller helper.
    isReady: vi.fn(() => false),
    setZoom: vi.fn(() => Promise.resolve()),
    goToSlide: vi.fn(() => Promise.resolve()),
    getSlideIndex: vi.fn(() => 2),
  };
}

describe("PptxRenderer", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    pptxViewerState.props = null;
    if (renderer != null) {
      await act(async () => renderer?.unmount());
    }
    renderer = undefined;
  });

  it("uses the lower-level continuous viewer with all vendor chrome disabled", async () => {
    const blob = new Blob(["pptx"]);
    const onPageCountChange = vi.fn();
    const onVisiblePageChange = vi.fn();
    const onSettled = vi.fn();
    const controller = createController();

    await act(async () => {
      renderer = create(
        <PptxRenderer
          blob={blob}
          page={1}
          zoom={125}
          onError={vi.fn()}
          onPageCountChange={onPageCountChange}
          onVisiblePageChange={onVisiblePageChange}
          onProgrammaticPageNavigateSettled={onSettled}
        />,
      );
    });

    expect(pptxViewerState.props).toMatchObject({
      source: blob,
      mode: "continuous",
      zoom: 125,
      showToolbar: false,
      showThumbnails: false,
      showNotes: false,
      showDiagnostics: false,
      virtualization: { enabled: true, overscanViewport: 2 },
    });

    await act(async () => {
      pptxViewerState.props?.onReady(controller);
      pptxViewerState.props?.onLoad({ document: { slides: [{}, {}, {}] } });
      pptxViewerState.props?.onSlideChange(1);
    });

    expect(onPageCountChange).toHaveBeenCalledWith(3);
    expect(onVisiblePageChange).toHaveBeenCalledWith(2);

    await act(async () => {
      renderer?.update(
        <PptxRenderer
          blob={blob}
          page={3}
          navIntent={1}
          zoom={125}
          onError={vi.fn()}
          onPageCountChange={onPageCountChange}
          onVisiblePageChange={onVisiblePageChange}
          onProgrammaticPageNavigateSettled={onSettled}
        />,
      );
      await Promise.resolve();
    });

    expect(controller.goToSlide).toHaveBeenCalledWith(2, {
      behavior: "smooth",
      block: "start",
    });
    expect(onSettled).toHaveBeenCalledWith(3);
  });

  it("replays a chrome navigation command received before the controller is ready", async () => {
    const blob = new Blob(["pptx"]);
    const controller = createController();

    await act(async () => {
      renderer = create(
        <PptxRenderer
          blob={blob}
          page={1}
          navIntent={0}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
      renderer?.update(
        <PptxRenderer
          blob={blob}
          page={3}
          navIntent={1}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
    });

    await act(async () => {
      pptxViewerState.props?.onLoad({ document: { slides: [{}, {}, {}] } });
      pptxViewerState.props?.onReady(controller);
      await Promise.resolve();
    });

    expect(controller.goToSlide).toHaveBeenCalledWith(2, {
      behavior: "smooth",
      block: "start",
    });
  });

  it("passes rewritten bytes when slide parts contain encoded bullets", async () => {
    const blob = pptxBlobWithEncodedBullet();

    await act(async () => {
      renderer = create(
        <PptxRenderer
          blob={blob}
          page={1}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
    });

    const source = pptxViewerState.props?.source as ArrayBuffer;
    expect(source).toBeInstanceOf(ArrayBuffer);
    expect(source).not.toBe(blob);
    const entries = await readZipEntries(new Uint8Array(source));
    const slide = new TextDecoder().decode(
      entries.find((entry) => entry.name === "ppt/slides/slide1.xml")!.bytes,
    );
    expect(slide).toContain('char="•"');
    expect(slide).not.toContain("&#x2022;");
  });
});
