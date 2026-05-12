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

  it("detects spreadsheet for text csv", async () => {
    const blob = new Blob(["col1,col2\n1,2\n"], { type: "text/csv" });
    const result = await detectFileKind(blob);
    expect(result.kind).toBe("spreadsheet");
  });
});
