import { ErrorCodes, type ErrorCode } from "@/app/errors/error-codes";
import type { LLMConfig } from "@/app/types/chat";
import type { ImagePart } from "@/app/types/chat";
import type { Logger } from "@/lib/logger";
import {
  checkVisionSupport,
  convertImagePartsToFileUIParts,
  validateImageParts,
} from "@/lib/attachment-converter";
import type { UIMessage } from "ai";

type ImageProcessOk = {
  ok: true;
  processedMessages: UIMessage[];
  allImageParts: ImagePart[];
};

type ImageProcessError = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    status: number;
  };
};

export type ImageProcessResult = ImageProcessOk | ImageProcessError;

export function processImageAttachments(
  messages: UIMessage[],
  config: LLMConfig,
  logger: Logger,
): ImageProcessResult {
  // 步骤 1: 检查 vision 支持（有图片但模型不支持时硬拒绝）
  const visionCheck = checkVisionSupport(
    messages,
    Boolean(config.capabilities?.supportsVision),
  );

  if (visionCheck.shouldReject) {
    logger.warn("拒绝图片消息: 模型不支持 vision", {
      modelName: config.modelName,
    });

    return {
      ok: false,
      error: {
        code: ErrorCodes.CHAT_VISION_NOT_SUPPORTED,
        message: visionCheck.errorMessage || "Model does not support vision",
        status: 400,
      },
    };
  }

  // 步骤 2: 提取并验证所有图片 parts（数量/大小/MIME）
  const allImageParts: ImagePart[] = [];
  for (const msg of messages) {
    const parts = (msg as unknown as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    const imageParts = parts.filter((part): part is ImagePart => {
      if (typeof part !== "object" || part === null) {
        return false;
      }

      return (part as { type?: unknown }).type === "image";
    });

    allImageParts.push(...imageParts);
  }

  if (allImageParts.length > 0) {
    const validation = validateImageParts(allImageParts);
    if (!validation.valid) {
      logger.warn("图片验证失败", {
        error: validation.error,
        imageCount: allImageParts.length,
      });

      return {
        ok: false,
        error: {
          code: ErrorCodes.CHAT_INVALID_IMAGE,
          message: validation.error || "Invalid image attachments",
          status: 400,
        },
      };
    }
  }

  // 步骤 3: 将 ImagePart 原地替换为 AI SDK 标准的 FileUIPart（保持 parts 顺序）
  const processedMessages: UIMessage[] = messages.map((msg) => {
    const parts = (msg as unknown as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) {
      return msg;
    }

    const imageParts = parts.filter((part): part is ImagePart => {
      if (typeof part !== "object" || part === null) {
        return false;
      }

      return (part as { type?: unknown }).type === "image";
    });

    if (imageParts.length === 0) {
      return msg;
    }

    const fileParts = convertImagePartsToFileUIParts(imageParts);
    let fileIndex = 0;

    const nextParts = parts.map((part) => {
      if (typeof part !== "object" || part === null) {
        return part;
      }

      if ((part as { type?: unknown }).type !== "image") {
        return part;
      }

      const nextFile = fileParts[fileIndex];
      fileIndex += 1;
      return nextFile ?? part;
    });

    return {
      ...msg,
      parts: nextParts as unknown as UIMessage["parts"],
    };
  });

  return { ok: true, processedMessages, allImageParts };
}
