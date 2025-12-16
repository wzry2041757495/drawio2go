import type { FileUIPart, UIMessage } from "ai";

import type { ImageMimeType, ImagePart } from "@/app/types/chat";

/**
 * 单条消息最多允许的图片数量
 */
export const MAX_IMAGES_PER_MESSAGE = 5;

/**
 * 单张图片最大大小（MB）
 */
export const MAX_IMAGE_SIZE_MB = 5;

/**
 * 单条消息内所有图片总大小最大值（MB）
 */
export const MAX_TOTAL_IMAGE_SIZE_MB = 15;

/**
 * Data URL 格式的图片内容（用于模型输入传递）
 */
interface DataURLImageContent {
  type: "image";
  mimeType: string;
  dataUrl: string; // data:image/...;base64,...
}

const MB_TO_BYTES = 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * MB_TO_BYTES;
const MAX_TOTAL_IMAGE_SIZE_BYTES = MAX_TOTAL_IMAGE_SIZE_MB * MB_TO_BYTES;

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const satisfies readonly ImageMimeType[];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase();
}

function isAllowedImageMimeType(mimeType: string): mimeType is ImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(
    normalizeMimeType(mimeType),
  );
}

/**
 * Base64 字符串长度约为原始字节数的 4/3
 * dataUrl 格式: data:image/png;base64,<base64-string>
 */
function estimateDataUrlSizeInBytes(dataUrl: string): number {
  const base64Part = dataUrl.split(",")[1] || "";
  return Math.ceil((base64Part.length * 3) / 4);
}

function extractMimeTypeFromDataUrl(dataUrl: string): string | null {
  // data:<mimeType>;base64,<...>
  const match = /^data:([^;]+);base64,/i.exec(dataUrl);
  return match?.[1]?.trim().toLowerCase() ?? null;
}

function extensionFromMimeType(mimeType: string): string {
  const normalized = normalizeMimeType(mimeType);
  if (normalized === "image/png") return "png";
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/webp") return "webp";
  return "bin";
}

function isImagePartLike(value: unknown): value is ImagePart {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.type === "image";
}

function isFileUIPartLike(value: unknown): value is FileUIPart {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.type === "file" &&
    typeof record.url === "string" &&
    typeof record.mediaType === "string"
  );
}

/**
 * 将自定义 `ImagePart` 转换为 AI SDK 标准的 `FileUIPart`。
 *
 * 说明：
 * - 前端以 Data URL（JSON）传递图片给 Chat API
 * - Chat API 会把图片部分转换为 `FileUIPart` 以便 `convertToModelMessages` 正常工作
 *
 * @param imageParts - 来自 `UIMessage.parts` 的图片 parts（自定义 ImagePart）
 * @returns 转换后的 `FileUIPart[]`
 * @throws Error - 当任意图片缺少 `dataUrl` 或 MIME 类型不合法时抛出友好错误
 */
export function convertImagePartsToFileUIParts(
  imageParts: ImagePart[],
): FileUIPart[] {
  return imageParts
    .map((part, index): FileUIPart => {
      const mimeType = normalizeMimeType(part.mimeType || "");
      if (!isAllowedImageMimeType(mimeType)) {
        throw new Error(
          `不支持的图片格式: ${part.mimeType || "(空)"} (仅支持 ${ALLOWED_IMAGE_MIME_TYPES.join(", ")})`,
        );
      }

      if (!isNonEmptyString(part.dataUrl)) {
        const nameHint = isNonEmptyString(part.fileName)
          ? `（${part.fileName}）`
          : "";
        throw new Error(
          `图片内容缺失${nameHint}：未提供 dataUrl。请重新上传图片或刷新后重试。`,
        );
      }

      const dataUrlMime = extractMimeTypeFromDataUrl(part.dataUrl);
      if (dataUrlMime && normalizeMimeType(dataUrlMime) !== mimeType) {
        throw new Error(
          `图片 MIME 类型与 dataUrl 不一致：mimeType=${mimeType}, dataUrl=${dataUrlMime}`,
        );
      }

      const ext = extensionFromMimeType(mimeType);
      const filename = isNonEmptyString(part.fileName)
        ? part.fileName.trim()
        : `image-${index + 1}.${ext}`;

      return {
        type: "file",
        mediaType: mimeType,
        url: part.dataUrl,
        filename,
      };
    })
    .filter(Boolean);
}

/**
 * 验证消息中的图片是否符合限制（数量 / 单张大小 / 总大小 / MIME 白名单）。
 *
 * 注意：大小为估算值（基于 base64 长度），用于 API 入参保护与快速拒绝。
 *
 * @param imageParts - 图片 parts（来自 UIMessage.parts）
 * @returns 校验结果
 */
export function validateImageParts(imageParts: ImagePart[]): {
  valid: boolean;
  error?: string;
} {
  if (!Array.isArray(imageParts) || imageParts.length === 0) {
    return { valid: true };
  }

  if (imageParts.length > MAX_IMAGES_PER_MESSAGE) {
    return {
      valid: false,
      error: `图片数量超过限制：最多允许 ${MAX_IMAGES_PER_MESSAGE} 张（当前 ${imageParts.length} 张）`,
    };
  }

  let totalBytes = 0;

  for (let i = 0; i < imageParts.length; i += 1) {
    const part = imageParts[i];
    const indexLabel = `第 ${i + 1} 张`;
    const nameHint = isNonEmptyString(part.fileName)
      ? `（${part.fileName}）`
      : "";

    const mimeType = normalizeMimeType(part.mimeType || "");
    if (!isAllowedImageMimeType(mimeType)) {
      return {
        valid: false,
        error: `${indexLabel}${nameHint}格式不支持：${part.mimeType || "(空)"}（仅支持 ${ALLOWED_IMAGE_MIME_TYPES.join(", ")}）`,
      };
    }

    if (!isNonEmptyString(part.dataUrl)) {
      return {
        valid: false,
        error: `${indexLabel}${nameHint}缺少 dataUrl（图片内容未就绪）。请重新上传图片或刷新后重试。`,
      };
    }

    const dataUrlMime = extractMimeTypeFromDataUrl(part.dataUrl);
    if (dataUrlMime && normalizeMimeType(dataUrlMime) !== mimeType) {
      return {
        valid: false,
        error: `${indexLabel}${nameHint} MIME 类型与 dataUrl 不一致：mimeType=${mimeType}, dataUrl=${dataUrlMime}`,
      };
    }

    const bytes = estimateDataUrlSizeInBytes(part.dataUrl);
    if (bytes > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (bytes / MB_TO_BYTES).toFixed(2);
      return {
        valid: false,
        error: `${indexLabel}${nameHint}过大：约 ${sizeMB}MB，单张上限 ${MAX_IMAGE_SIZE_MB}MB`,
      };
    }

    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_IMAGE_SIZE_BYTES) {
      const totalMB = (totalBytes / MB_TO_BYTES).toFixed(2);
      return {
        valid: false,
        error: `图片总大小超过限制：约 ${totalMB}MB，总上限 ${MAX_TOTAL_IMAGE_SIZE_MB}MB`,
      };
    }
  }

  return { valid: true };
}

/**
 * 检查“消息是否包含图片”以及“模型是否支持视觉输入（vision）”。
 *
 * @param messages - Chat API 入参中的 UIMessage 列表（运行时可能包含自定义 ImagePart）
 * @param supportsVision - 当前模型是否支持 vision
 * @returns 是否需要硬拒绝（400）以及对应的错误消息
 */
export function checkVisionSupport(
  messages: UIMessage[],
  supportsVision: boolean,
): { shouldReject: boolean; errorMessage?: string } {
  const hasImages =
    Array.isArray(messages) &&
    messages.some((message) => {
      const parts = (message as unknown as { parts?: unknown }).parts;
      if (!Array.isArray(parts)) {
        return false;
      }

      return parts.some((part) => {
        if (isImagePartLike(part)) {
          return true;
        }

        // 兼容：如果上游已将图片转换为 FileUIPart，也应视为图片输入
        if (isFileUIPartLike(part)) {
          const mediaType = normalizeMimeType(part.mediaType || "");
          return mediaType.startsWith("image/");
        }

        // 兼容：某些调用方可能使用 DataURLImageContent 结构
        if (
          typeof part === "object" &&
          part !== null &&
          (part as DataURLImageContent).type === "image" &&
          isNonEmptyString((part as DataURLImageContent).dataUrl)
        ) {
          return true;
        }

        return false;
      });
    });

  if (hasImages && !supportsVision) {
    return {
      shouldReject: true,
      errorMessage:
        "当前模型不支持视觉输入,无法处理图片消息。请切换支持 vision 的模型(如 gpt-4o)或移除图片后重试。",
    };
  }

  return { shouldReject: false };
}
