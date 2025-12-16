import { compressBlob, decompressBlob } from "./compression-utils";
import { createBlobFromSource } from "./blob-utils";

/**
 * 最大图片大小（与存储层保持一致）
 */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * 支持的图片 MIME 类型（与存储层保持一致）
 */
export const ALLOWED_IMAGE_MIMES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

/**
 * 图片校验相关错误消息
 */
export const IMAGE_ERROR_MESSAGES = {
  INVALID_TYPE: "不支持的图片格式",
  FILE_TOO_LARGE: "图片大小超过限制 (最大10MB)",
  DECODE_FAILED: "图片解码失败,文件可能已损坏",
  DIMENSION_FAILED: "无法获取图片尺寸",
  RESOLUTION_TOO_LARGE: "图片分辨率过大",
} as const;

/**
 * 用于防止极端分辨率（解码炸弹/超大 Canvas 风险）
 *
 * - MAX_IMAGE_DIMENSION: 单边最大像素
 * - MAX_IMAGE_PIXELS: 总像素上限（宽*高）
 */
export const MAX_IMAGE_DIMENSION = 16_384;
export const MAX_IMAGE_PIXELS = 100_000_000;

function isAllowedImageMime(mimeType: string): mimeType is AllowedImageMime {
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(mimeType);
}

function ensureCreateImageBitmap(): typeof createImageBitmap {
  if (typeof createImageBitmap !== "function") {
    throw new Error(IMAGE_ERROR_MESSAGES.DECODE_FAILED);
  }
  return createImageBitmap;
}

/**
 * 验证图片文件的合法性
 *
 * @param blob - 图片 Blob 对象
 * @param mimeType - MIME 类型（建议传入上层已确认的类型；若为空则回退到 blob.type）
 * @throws Error - 验证失败时抛出友好的错误消息
 */
export async function validateImage(
  blob: Blob,
  mimeType: string,
): Promise<void> {
  const resolvedMime = (mimeType || blob.type || "").toLowerCase();

  // 1. 检查 MIME 类型
  if (!isAllowedImageMime(resolvedMime)) {
    throw new Error(IMAGE_ERROR_MESSAGES.INVALID_TYPE);
  }

  // 2. 检查文件大小
  if (blob.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(IMAGE_ERROR_MESSAGES.FILE_TOO_LARGE);
  }

  // 3. 尝试解码验证 + 4. 验证宽高合理性
  const createBitmap = ensureCreateImageBitmap();
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createBitmap(blob);
    const { width, height } = bitmap;

    if (
      typeof width !== "number" ||
      typeof height !== "number" ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new Error(IMAGE_ERROR_MESSAGES.DIMENSION_FAILED);
    }

    const pixels = width * height;
    if (
      width > MAX_IMAGE_DIMENSION ||
      height > MAX_IMAGE_DIMENSION ||
      pixels > MAX_IMAGE_PIXELS
    ) {
      throw new Error(
        `${IMAGE_ERROR_MESSAGES.RESOLUTION_TOO_LARGE} (最大 ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}, 总像素上限 ${(MAX_IMAGE_PIXELS / 1_000_000).toFixed(0)}MP)`,
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message || "";
      const friendlyMessages = new Set<string>([
        IMAGE_ERROR_MESSAGES.INVALID_TYPE,
        IMAGE_ERROR_MESSAGES.FILE_TOO_LARGE,
        IMAGE_ERROR_MESSAGES.DECODE_FAILED,
        IMAGE_ERROR_MESSAGES.DIMENSION_FAILED,
      ]);

      if (
        friendlyMessages.has(message) ||
        message.startsWith(IMAGE_ERROR_MESSAGES.RESOLUTION_TOO_LARGE)
      ) {
        throw error;
      }
    }

    throw new Error(IMAGE_ERROR_MESSAGES.DECODE_FAILED);
  } finally {
    bitmap?.close();
  }
}

/**
 * 获取图片的宽度和高度
 *
 * @param blob - 图片 Blob 对象
 * @returns 图片尺寸 { width, height }
 * @throws Error - 获取失败时抛出友好的错误消息
 */
export async function getImageDimensions(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  const createBitmap = ensureCreateImageBitmap();
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createBitmap(blob);
    const { width, height } = bitmap;
    if (
      typeof width !== "number" ||
      typeof height !== "number" ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new Error(IMAGE_ERROR_MESSAGES.DIMENSION_FAILED);
    }
    return { width, height };
  } catch {
    throw new Error(IMAGE_ERROR_MESSAGES.DIMENSION_FAILED);
  } finally {
    bitmap?.close();
  }
}

/**
 * Blob 转 Base64（用于发送给视觉模型）
 *
 * 注意：仅返回 Base64 字符串，不包含 data URI 前缀（例如不包含 "data:image/png;base64,"）。
 *
 * @param blob - 图片 Blob 对象
 * @returns Base64 字符串（无前缀）
 * @throws Error - 转换失败时抛出错误
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();

  // Node/Electron（Buffer 存在）路径更快且更省内存
  if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
    return Buffer.from(new Uint8Array(buffer)).toString("base64");
  }

  if (typeof btoa !== "function") {
    throw new Error("当前环境不支持 Base64 编码");
  }

  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j += 1) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

/**
 * Base64 转 Blob（可用于调试或反向转换）
 *
 * @param base64 - Base64 字符串（不包含 data URI 前缀）
 * @param mimeType - MIME 类型
 * @returns Blob 对象
 * @throws Error - 转换失败时抛出错误
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  let decoded: ArrayBufferView;

  if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
    decoded = Buffer.from(base64, "base64");
  } else if (typeof atob === "function") {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    decoded = bytes;
  } else {
    throw new Error("当前环境不支持 Base64 解码");
  }

  const blob = createBlobFromSource(decoded, mimeType);
  if (!blob) {
    throw new Error("Base64 转 Blob 失败");
  }
  return blob;
}

/**
 * 压缩图片 Blob（deflate-raw）
 *
 * 注意：对已压缩的图片格式（JPEG/PNG/WebP）收益很小，
 * 主要用于与 SVG 处理保持一致的存储策略。
 *
 * @param blob - 图片 Blob 对象
 * @returns 压缩后的 Blob（内容为 deflate-raw 数据流）
 */
export async function compressImageBlob(blob: Blob): Promise<Blob> {
  return compressBlob(blob);
}

/**
 * 解压图片 Blob（deflate-raw）
 *
 * @param blob - 压缩后的 Blob（内容为 deflate-raw 数据流）
 * @returns 解压后的 Blob
 */
export async function decompressImageBlob(blob: Blob): Promise<Blob> {
  return decompressBlob(blob);
}
