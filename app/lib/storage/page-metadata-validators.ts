import { MAX_SVG_BLOB_BYTES } from "./constants";
import { buildPageMetadataFromXml } from "./page-metadata";

export type BinaryLike =
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | null
  | undefined;

export interface ResolvePageMetadataOptions {
  xmlContent: string;
  userPageCount?: number;
  userPageNames?: string | null;
}

export interface ResolvedPageMetadata {
  pageCount: number;
  pageNamesJson: string;
}

export function ensurePageCount(value?: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || value < 1) {
    throw new Error("page_count 必须是大于等于 1 的数字");
  }
  return Math.floor(value);
}

export function parsePageNamesJson(
  value: string | undefined | null,
): string[] | undefined {
  if (value == null) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(
      `page_names 必须是 JSON 数组字符串: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error("page_names 必须是 JSON 数组字符串");
  }
  parsed.forEach((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`page_names[${index}] 不是字符串`);
    }
  });
  return parsed as string[];
}

export function resolvePageMetadataFromXml(
  options: ResolvePageMetadataOptions,
): ResolvedPageMetadata {
  const { xmlContent, userPageCount, userPageNames } = options;
  const meta = buildPageMetadataFromXml(xmlContent);
  const pageCount = ensurePageCount(userPageCount ?? meta.pageCount);
  const providedNames = parsePageNamesJson(userPageNames);
  const pageNames =
    providedNames?.slice(0, pageCount) ?? meta.pageNames.slice(0, pageCount);

  return {
    pageCount,
    pageNamesJson: JSON.stringify(pageNames),
  };
}

export function assertValidSvgBinary(
  blob: BinaryLike,
  label = "SVG 数据",
): void {
  if (!blob) {
    return;
  }

  let size = 0;
  if (blob instanceof Blob) {
    size = blob.size;
  } else if (blob instanceof ArrayBuffer) {
    size = blob.byteLength;
  } else if (ArrayBuffer.isView(blob)) {
    size = blob.byteLength;
  } else {
    return;
  }

  if (size > MAX_SVG_BLOB_BYTES) {
    const maxMB = (MAX_SVG_BLOB_BYTES / (1024 * 1024)).toFixed(1);
    throw new Error(`${label}体积超过 ${maxMB}MB 限制`);
  }
}
