/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

const { embedPdfState } = vi.hoisted(() => ({
  embedPdfState: {
    plugins: [] as unknown[],
    documentManager: {
      closeDocument: () => ({ wait: () => undefined }),
      openDocumentBuffer: () => ({
        toPromise: () => Promise.resolve({
          documentId: "pdf-document",
          task: { toPromise: () => Promise.resolve({ pageCount: 1 }) },
        }),
      }),
    },
    useZoom: vi.fn(),
  },
}));

vi.mock("@embedpdf/core/react", () => ({
  EmbedPDF: ({ children, plugins }: { children: unknown; plugins: unknown }) => {
    embedPdfState.plugins.push(plugins);
    return children;
  },
  useDocumentState: () => ({ document: { pageCount: 1 } }),
}));

vi.mock("@embedpdf/plugin-document-manager/react", () => ({
  DocumentManagerPluginPackage: {},
  useDocumentManagerCapability: () => ({
    provides: embedPdfState.documentManager,
  }),
}));

vi.mock("@embedpdf/plugin-render/react", () => ({
  RenderLayer: () => null,
  RenderPluginPackage: {},
}));

vi.mock("@embedpdf/plugin-scroll/react", () => ({
  Scroller: () => null,
  ScrollPluginPackage: {},
  useScroll: () => ({
    provides: {
      onPageChange: () => () => undefined,
      scrollToPage: () => undefined,
    },
    state: { currentPage: 1, totalPages: 1 },
  }),
}));

vi.mock("@embedpdf/plugin-search/react", () => ({
  SearchLayer: () => null,
  SearchPluginPackage: {},
  useSearch: () => ({
    provides: {
      goToResult: () => undefined,
      searchAllPages: () => ({ wait: () => undefined }),
      startSearch: () => undefined,
      stopSearch: () => undefined,
    },
    state: { loading: false, results: [], total: 0 },
  }),
}));

vi.mock("@embedpdf/plugin-viewport/react", () => ({
  Viewport: ({ children }: { children: unknown }) => children,
  ViewportPluginPackage: {},
  useViewportScrollActivity: () => ({ isScrolling: false, isSmoothScrolling: false }),
}));

vi.mock("@embedpdf/plugin-zoom/react", () => ({
  ZoomPluginPackage: {},
  useZoom: embedPdfState.useZoom.mockReturnValue({
    provides: { requestZoom: () => undefined },
  }),
}));

vi.mock("@embedpdf/engines/pdfium-worker-engine", () => ({
  createPdfiumEngine: () => ({ mocked: true }),
}));

vi.mock("../src/renderers/pdf/loadEmbedPdfEngine", () => ({
  loadEmbedPdfEngine: () => Promise.resolve({ mocked: true }),
}));

import { PdfRenderer } from "../src/renderers/PdfRenderer";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

function pdfBlob() {
  const bytes = new Uint8Array(128);
  bytes.set([0x25, 0x50, 0x44, 0x46]);
  return new Blob([bytes], { type: "application/pdf" });
}

describe("PdfRenderer", () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(async () => {
    if (renderer != null) {
      await act(async () => renderer?.unmount());
    }
    renderer = undefined;
    embedPdfState.useZoom.mockClear();
    embedPdfState.plugins.length = 0;
  });

  it("does not create document-scoped hooks before EmbedPDF opens the document", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      renderer = create(
        <PdfRenderer
          blob={pdfBlob()}
          page={1}
          pageCount={0}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await vi.waitFor(() => {
      expect(embedPdfState.useZoom).toHaveBeenCalledWith("pdf-document");
    });
    expect(embedPdfState.useZoom).not.toHaveBeenCalledWith("");
  });

  it("keeps the EmbedPDF registry configuration stable across parent updates", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const blob = pdfBlob();

    await act(async () => {
      renderer = create(
        <PdfRenderer
          blob={blob}
          page={1}
          pageCount={0}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    const initialPlugins = embedPdfState.plugins.at(-1);

    await act(async () => {
      renderer?.update(
        <PdfRenderer
          blob={blob}
          page={1}
          pageCount={1}
          zoom={100}
          onError={vi.fn()}
          onPageCountChange={vi.fn()}
        />,
      );
    });

    expect(embedPdfState.plugins.at(-1)).toBe(initialPlugins);
  });
});
