import type { LLMConfig } from "@/app/types/chat";
import type { Logger } from "@/lib/logger";
import type { ModelMessage } from "ai";

function extractRecentReasoning(messages: ModelMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "assistant") {
      continue;
    }

    const { content } = message;
    if (!Array.isArray(content)) {
      return undefined;
    }

    const reasoningText = content
      .filter((part) => part.type === "reasoning")
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    return reasoningText || undefined;
  }

  return undefined;
}

function isNewUserQuestion(messages: ModelMessage[]): boolean {
  if (messages.length === 0) {
    return false;
  }

  const lastMessage = messages[messages.length - 1];
  return lastMessage.role === "user";
}

export function buildReasoningParams(
  config: LLMConfig,
  messages: ModelMessage[],
  logger: Logger,
): {
  experimentalParams?: Record<string, unknown>;
  reasoningContent?: string;
} {
  let experimentalParams: Record<string, unknown> | undefined;
  let reasoningContent: string | undefined;

  try {
    if (config.enableToolsInThinking && config.capabilities?.supportsThinking) {
      const isNewQuestion = isNewUserQuestion(messages);

      if (!isNewQuestion) {
        reasoningContent = extractRecentReasoning(messages);

        if (reasoningContent) {
          experimentalParams = { reasoning_content: reasoningContent };

          logger.debug("复用 reasoning_content", {
            length: reasoningContent.length,
          });
        } else {
          logger.debug("无可复用的 reasoning_content");
        }
      } else {
        logger.debug("新用户问题，跳过 reasoning_content 复用");
      }
    }
  } catch (reasoningError) {
    logger.error("构建 reasoning_content 失败，已降级为普通模式", {
      error:
        reasoningError instanceof Error
          ? reasoningError.message
          : reasoningError,
      stack: reasoningError instanceof Error ? reasoningError.stack : undefined,
    });
  }

  return { experimentalParams, reasoningContent };
}
