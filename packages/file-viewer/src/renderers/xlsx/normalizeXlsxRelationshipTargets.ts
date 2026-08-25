import { transformOfficeZipParts } from "../office/officeZipArchive";

function relativePath(fromDirectory: string, target: string): string {
  const fromParts = fromDirectory.split("/").filter(Boolean);
  const targetParts = target.replace(/^\/+/, "").split("/").filter(Boolean);
  let common = 0;
  while (
    common < fromParts.length &&
    common < targetParts.length &&
    fromParts[common] === targetParts[common]
  ) {
    common += 1;
  }
  return [
    ...Array.from({ length: fromParts.length - common }, () => ".."),
    ...targetParts.slice(common),
  ].join("/");
}

function relationshipOwnerDirectory(relationshipPath: string): string {
  const normalized = relationshipPath.replaceAll("\\", "/");
  const marker = "/_rels/";
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex >= 0) return normalized.slice(0, markerIndex);
  return normalized.startsWith("_rels/") ? "" : normalized;
}

function normalizeRelationshipXml(xml: string, relationshipPath: string): string {
  const ownerPath = relationshipOwnerDirectory(relationshipPath);
  return xml.replace(
    /(\bTarget\s*=\s*["'])\/(?!\/)([^"']+)(["'])/gi,
    (_match, prefix: string, target: string, suffix: string) =>
      `${prefix}${relativePath(ownerPath, target)}${suffix}`,
  );
}

/**
 * Extend's XLSX parser expects drawing/chart relationship targets to be
 * relative. Package-absolute targets are valid OOXML, and are used by
 * report.xlsx, so normalize them before handing the bytes to Extend.
 */
export async function normalizeXlsxRelationshipTargets(
  input: ArrayBuffer,
): Promise<ArrayBuffer> {
  return transformOfficeZipParts(input, {
    shouldTransform: (name) => name.toLowerCase().endsWith(".rels"),
    transformXml: (name, xml) => normalizeRelationshipXml(xml, name),
  });
}
