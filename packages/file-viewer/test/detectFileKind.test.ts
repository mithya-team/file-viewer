import { describe, expect, it } from "vitest";
import { detectFileKind } from "../src/detect/detectFileKind";

describe("detectFileKind", () => {
  it("detects pdf by magic bytes", async () => {
    const blob = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: "application/octet-stream" });
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("pdf");
  });

  it("detects image by png signature", async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])]);
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("image");
  });

  it("detects little-endian TIFF by magic bytes", async () => {
    const blob = new Blob([new Uint8Array([0x49, 0x49, 0x2a, 0x00])], {
      type: "application/octet-stream",
    });
    const result = await detectFileKind(blob);
    expect(result).toEqual({ kind: "image", mimeType: "image/tiff" });
  });

  it("detects big-endian TIFF by magic bytes", async () => {
    const blob = new Blob([new Uint8Array([0x4d, 0x4d, 0x00, 0x2a])]);
    const result = await detectFileKind(blob);
    expect(result).toEqual({ kind: "image", mimeType: "image/tiff" });
  });

  it("detects spreadsheet for text csv", async () => {
    const blob = new Blob(["col1,col2\n1,2\n"], { type: "text/csv" });
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("spreadsheet");
  });

  it("detects dotx through the docx path", async () => {
    const blob = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04]), "word/document.xml"], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    });
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("docx");
  });

  it("does not treat arbitrary OLE data as spreadsheet", async () => {
    const blob = new Blob([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0x00, 0x01, 0x02, 0x03])], {
      type: "application/octet-stream",
    });
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("unsupported");
  });

  it("does not trust textual MIME when bytes are not text", async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xfe, 0xfd, 0xfc])], { type: "text/plain" });
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("unsupported");
  });

  it("does not infer plain text without MIME", async () => {
    const blob = new Blob(["plain text without MIME"]);
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("unsupported");
  });

  it("does not infer csv without MIME", async () => {
    const blob = new Blob(["col1,col2\n1,2\n"]);
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("unsupported");
  });

  it("does not treat unknown zip payloads as supported openxml formats", async () => {
    const blob = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04]), "ppt/slides/slide1.xml"], {
      type: "application/zip",
    });
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("unsupported");
  });
});
