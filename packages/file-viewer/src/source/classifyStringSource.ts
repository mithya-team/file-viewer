export type StringSourceKind = "data-url" | "object-url" | "http-url" | "base64";

const DATA_URL_PATTERN = /^data:[^,]+,/i;
const OBJECT_URL_PATTERN = /^blob:/i;
const HTTP_URL_PATTERN = /^https?:\/\//i;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const BASE64_SIGNAL_PATTERN = /[+/=]/;

function isLikelyBase64String(value: string) {
  if (!BASE64_PATTERN.test(value) || value.length === 0) return false;
  return BASE64_SIGNAL_PATTERN.test(value) || value.length >= 12;
}

export function classifyStringSource(value: string): StringSourceKind {
  const trimmed = value.trim();
  if (DATA_URL_PATTERN.test(trimmed)) return "data-url";
  if (OBJECT_URL_PATTERN.test(trimmed)) return "object-url";
  if (HTTP_URL_PATTERN.test(trimmed)) return "http-url";
  if (isLikelyBase64String(trimmed)) return "base64";
  throw new Error("Unsupported string source format.");
}
