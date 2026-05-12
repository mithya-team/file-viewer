import { describe, expect, it } from "vitest";
import { classifyStringSource } from "../src/source/classifyStringSource";

describe("classifyStringSource", () => {
  it("classifies data URLs first", () => {
    expect(classifyStringSource("data:text/plain;base64,SGVsbG8=")).toBe("data-url");
  });

  it("classifies object URLs", () => {
    expect(classifyStringSource("blob:https://example.com/a")).toBe("object-url");
  });

  it("classifies HTTP URL before base64", () => {
    expect(classifyStringSource("https://example.com/file.txt")).toBe("http-url");
  });

  it("classifies base64 fallback", () => {
    expect(classifyStringSource("SGVsbG8=")).toBe("base64");
  });

  it("rejects ambiguous plain strings", () => {
    expect(() => classifyStringSource("test")).toThrow("Unsupported string source format.");
  });
});
