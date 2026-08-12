import { describe, expect, it } from "vitest";
import { decodeCsvText } from "../src/renderers/CsvRenderer";

function buffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe("decodeCsvText", () => {
  it("decodes UTF-8 and strips a UTF-8 BOM", () => {
    expect(decodeCsvText(buffer([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62]))).toBe("a,b");
  });

  it("decodes UTF-16 little-endian and big-endian BOMs", () => {
    expect(decodeCsvText(buffer([0xff, 0xfe, 0x61, 0x00, 0x2c, 0x00, 0x62, 0x00]))).toBe("a,b");
    expect(decodeCsvText(buffer([0xfe, 0xff, 0x00, 0x61, 0x00, 0x2c, 0x00, 0x62]))).toBe("a,b");
  });

  it("uses an explicitly declared charset when no BOM is present", () => {
    expect(decodeCsvText(buffer([0x63, 0x61, 0x66, 0xe9]), "text/csv; charset=windows-1252")).toBe("café");
  });

  it("rejects malformed unlabeled UTF-8 rather than silently corrupting cells", () => {
    expect(() => decodeCsvText(buffer([0xc3, 0x28]))).toThrow();
  });
});
