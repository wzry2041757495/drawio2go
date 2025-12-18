import { normalizeLLMConfig, isProviderType } from "@/app/lib/config-utils";
import type { LLMConfig, ProviderType } from "@/app/types/chat";
import { ErrorCodes, type ErrorCode } from "@/app/errors/error-codes";
import { createLogger } from "@/lib/logger";
import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  tool,
  jsonSchema,
} from "ai";
import type { Tool, UIMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { createModelFromConfig } from "@/lib/model-factory";
import { classifyError } from "@/lib/error-classifier";

const logger = createLogger("AI Proxy API");

const MAX_TOOLS_PAYLOAD_BYTES = 64 * 1024;

type IncomingTools = Record<
  string,
  { description?: string; inputJsonSchema: unknown }
>;

type AiProxyRequest = {
  messages: UIMessage[];
  config: AiProxyIncomingConfig;
  tools?: IncomingTools;
};

type AiProxyIncomingConfig = {
  providerType: string;
  modelName: string;
  apiUrl?: string;
  apiKey: string;
  systemPrompt?: string;
  temperature?: number;
  maxToolRounds?: number;
};

type AiProxyConfig = Omit<AiProxyIncomingConfig, "providerType"> & {
  providerType: ProviderType;
};

type AiProxyRequestParamsOk = {
  ok: true;
  messages: UIMessage[];
  rawConfig: AiProxyConfig;
  tools?: IncomingTools;
};

type AiProxyRequestParamsError = {
  ok: false;
  error: { code: ErrorCode; message: string; status: number };
};

type AiProxyRequestParamsResult =
  | AiProxyRequestParamsOk
  | AiProxyRequestParamsError;

type ParseToolsOk = { ok: true; tools?: IncomingTools };
type ParseToolsError = {
  ok: false;
  error: { code: ErrorCode; message: string; status: number };
};
type ParseToolsResult = ParseToolsOk | ParseToolsError;

function apiError(
  code: ErrorCode,
  message: string,
  status = 500,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
      error: { code, message },
      ...(details ?? {}),
    },
    { status, statusText: message },
  );
}

function toToolSet(
  payload: IncomingTools | undefined,
): Record<string, Tool> | undefined {
  if (!payload) return undefined;

  const entries = Object.entries(payload);
  if (entries.length === 0) return undefined;

  const toolSet: Record<string, Tool> = {};

  for (const [name, def] of entries) {
    toolSet[name] = tool({
      description: def.description,
      inputSchema: jsonSchema(def.inputJsonSchema as never),
      // 注意：不要提供 execute，确保后端不执行工具
    });
  }

  return toolSet;
}

function parseToolsPayload(toolsRaw: unknown): ParseToolsResult {
  if (typeof toolsRaw === "undefined") return { ok: true, tools: undefined };

  if (
    typeof toolsRaw !== "object" ||
    toolsRaw === null ||
    Array.isArray(toolsRaw)
  ) {
    return {
      ok: false,
      error: {
        code: ErrorCodes.CHAT_INVALID_CONFIG,
        message: "Invalid tools format (expected object map)",
        status: 400,
      },
    };
  }

  let payloadBytes = 0;
  try {
    payloadBytes = new TextEncoder().encode(
      JSON.stringify(toolsRaw),
    ).byteLength;
  } catch {
    return {
      ok: false,
      error: {
        code: ErrorCodes.CHAT_INVALID_CONFIG,
        message: "Invalid tools payload (not JSON-serializable)",
        status: 400,
      },
    };
  }

  if (payloadBytes > MAX_TOOLS_PAYLOAD_BYTES) {
    return {
      ok: false,
      error: {
        code: ErrorCodes.CHAT_INVALID_CONFIG,
        message: `Tools schema payload too large (${payloadBytes} bytes, max ${MAX_TOOLS_PAYLOAD_BYTES})`,
        status: 413,
      },
    };
  }

  const toolMap = toolsRaw as Record<string, unknown>;
  for (const [name, value] of Object.entries(toolMap)) {
    if (!name.trim()) {
      return {
        ok: false,
        error: {
          code: ErrorCodes.CHAT_INVALID_CONFIG,
          message: "Invalid tool name (empty)",
          status: 400,
        },
      };
    }

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {
        ok: false,
        error: {
          code: ErrorCodes.CHAT_INVALID_CONFIG,
          message: `Invalid tool definition for: ${name}`,
          status: 400,
        },
      };
    }

    const def = value as Record<string, unknown>;
    const description = def.description;
    if (typeof description !== "undefined" && typeof description !== "string") {
      return {
        ok: false,
        error: {
          code: ErrorCodes.CHAT_INVALID_CONFIG,
          message: `Invalid tool description for: ${name}`,
          status: 400,
        },
      };
    }

    if (!("inputJsonSchema" in def)) {
      return {
        ok: false,
        error: {
          code: ErrorCodes.CHAT_INVALID_CONFIG,
          message: `Missing inputJsonSchema for tool: ${name}`,
          status: 400,
        },
      };
    }
  }

  return { ok: true, tools: toolMap as IncomingTools };
}

function validateRequest(body: unknown): AiProxyRequestParamsResult {
  const rawBody =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : undefined;

  const messages = rawBody?.messages as UIMessage[] | undefined;
  const config = rawBody?.config as AiProxyIncomingConfig | undefined;
  const toolsRaw = rawBody?.tools as unknown;

  if (!Array.isArray(messages) || !config) {
    return {
      ok: false,
      error: {
        code: ErrorCodes.CHAT_MISSING_PARAMS,
        message: "Missing required parameters: messages or config",
        status: 400,
      },
    };
  }

  const toolsResult = parseToolsPayload(toolsRaw);
  if (!toolsResult.ok) return toolsResult;

  const providerType = config.providerType;
  if (!isProviderType(providerType)) {
    return {
      ok: false,
      error: {
        code: ErrorCodes.CHAT_INVALID_CONFIG,
        message: "Invalid providerType",
        status: 400,
      },
    };
  }

  if (typeof config.modelName !== "string" || !config.modelName.trim()) {
    return {
      ok: false,
      error: {
        code: ErrorCodes.CHAT_INVALID_CONFIG,
        message: "Missing required config field: modelName",
        status: 400,
      },
    };
  }

  if (typeof config.apiKey !== "string" || !config.apiKey.trim()) {
    return {
      ok: false,
      error: {
        code: ErrorCodes.CHAT_INVALID_CONFIG,
        message: "Missing required config field: apiKey",
        status: 400,
      },
    };
  }

  return {
    ok: true,
    messages,
    rawConfig: { ...config, providerType },
    tools: toolsResult.tools,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AiProxyRequest;
    const validation = validateRequest(body);

    if (!validation.ok) {
      return apiError(
        validation.error.code,
        validation.error.message,
        validation.error.status,
      );
    }

    const normalizedConfig: LLMConfig = normalizeLLMConfig({
      providerType: validation.rawConfig.providerType,
      modelName: validation.rawConfig.modelName,
      apiUrl: validation.rawConfig.apiUrl,
      apiKey: validation.rawConfig.apiKey,
      systemPrompt: validation.rawConfig.systemPrompt,
      temperature: validation.rawConfig.temperature,
      maxToolRounds: validation.rawConfig.maxToolRounds,
    });

    const model = createModelFromConfig(normalizedConfig);
    const modelMessages = convertToModelMessages(validation.messages);
    const toolSet = toToolSet(validation.tools);

    logger.info("收到 AI 代理请求", {
      provider: normalizedConfig.providerType,
      model: normalizedConfig.modelName,
      messagesCount: modelMessages.length,
      toolsCount: validation.tools ? Object.keys(validation.tools).length : 0,
    });

    const result = streamText({
      model,
      system: normalizedConfig.systemPrompt,
      messages: modelMessages,
      temperature: normalizedConfig.temperature,
      stopWhen: stepCountIs(normalizedConfig.maxToolRounds),
      tools: toolSet,
      abortSignal: req.signal,
    });

    return result.toUIMessageStreamResponse({ sendReasoning: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.info("[AI Proxy API] 流式响应被用户中断");
      return apiError(
        ErrorCodes.CHAT_REQUEST_CANCELLED,
        "Request cancelled by user",
        499,
      );
    }

    logger.error("AI Proxy API error", error);
    const err = error as Error;
    const classified = classifyError(err);

    return apiError(classified.code, classified.message, classified.statusCode);
  }
}
