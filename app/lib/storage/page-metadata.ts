const DIAGRAM_TAG_REGEX = /<diagram\b([^>]*)>/gi;
const DOUBLE_QUOTE_NAME = /name\s*=\s*"([^"]*)"/i;
const SINGLE_QUOTE_NAME = /name\s*=\s*'([^']*)'/i;

export interface PageMetadataSummary {
  pageCount: number;
  pageNames: string[];
}

const DEFAULT_PAGE_NAME = "Page";

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function normalizePageName(rawName: string | undefined, index: number): string {
  if (!rawName) {
    return `${DEFAULT_PAGE_NAME} ${index + 1}`;
  }

  const decoded = decodeXmlEntities(rawName).trim();
  if (decoded.length === 0) {
    return `${DEFAULT_PAGE_NAME} ${index + 1}`;
  }
  return decoded;
}

function extractDiagramNames(xml: string): string[] {
  const names: string[] = [];
  if (!xml || xml.trim().length === 0) {
    return names;
  }

  let match: RegExpExecArray | null;
  while ((match = DIAGRAM_TAG_REGEX.exec(xml)) !== null) {
    const attrs = match[1] || "";
    const dbl = attrs.match(DOUBLE_QUOTE_NAME);
    const sgl = attrs.match(SINGLE_QUOTE_NAME);
    const raw = dbl?.[1] ?? sgl?.[1] ?? undefined;
    names.push(normalizePageName(raw, names.length));
  }

  return names;
}

export function buildPageMetadataFromXml(
  xml: string | null | undefined,
): PageMetadataSummary {
  if (!xml) {
    return {
      pageCount: 1,
      pageNames: ["Page 1"],
    };
  }

  const names = extractDiagramNames(xml);
  if (names.length === 0) {
    return {
      pageCount: 1,
      pageNames: ["Page 1"],
    };
  }

  return {
    pageCount: names.length,
    pageNames: names,
  };
}
