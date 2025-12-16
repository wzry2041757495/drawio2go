import {
  normalizeLLMConfig,
  DEFAULT_ANTHROPIC_API_URL,
  DEFAULT_DEEPSEEK_API_URL,
  DEFAULT_OPENAI_API_URL,
} from "@/app/lib/config-utils";
import { LLMConfig } from "@/app/types/chat";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Test API");

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const normalizedConfig: LLMConfig = normalizeLLMConfig({
      apiUrl: body?.apiUrl,
      apiKey: body?.apiKey,
      temperature: body?.temperature,
      modelName: body?.modelName,
      providerType: body?.providerType,
      maxToolRounds: body?.maxToolRounds,
    });

    if (!normalizedConfig.apiUrl || !normalizedConfig.modelName) {
      return NextResponse.json(
        { error: "缺少必要的配置参数：apiUrl 和 modelName" },
        { status: 400 },
      );
    }

    // 根据 providerType 选择合适的 provider
    let model;

    if (normalizedConfig.providerType === "openai-reasoning") {
      // OpenAI Reasoning 模型：使用原生 @ai-sdk/openai
      const openaiProvider = createOpenAI({
        baseURL: normalizedConfig.apiUrl || DEFAULT_OPENAI_API_URL,
        apiKey: normalizedConfig.apiKey || "dummy-key",
      });
      model = openaiProvider.chat(normalizedConfig.modelName);
    } else if (normalizedConfig.providerType === "deepseek-native") {
      // DeepSeek Native：使用 @ai-sdk/deepseek
      const deepseekProvider = createDeepSeek({
        baseURL: normalizedConfig.apiUrl || DEFAULT_DEEPSEEK_API_URL,
        apiKey: normalizedConfig.apiKey || "dummy-key",
      });
      model = deepseekProvider(normalizedConfig.modelName);
    } else if (normalizedConfig.providerType === "anthropic") {
      const anthropicProvider = createAnthropic({
        baseURL: normalizedConfig.apiUrl || DEFAULT_ANTHROPIC_API_URL,
        apiKey: normalizedConfig.apiKey || "",
      });
      model = anthropicProvider(normalizedConfig.modelName);
    } else {
      // OpenAI Compatible：使用 @ai-sdk/openai-compatible
      const compatibleProvider = createOpenAICompatible({
        name: normalizedConfig.providerType,
        baseURL: normalizedConfig.apiUrl || DEFAULT_OPENAI_API_URL,
        apiKey: normalizedConfig.apiKey || "dummy-key",
      });
      model = compatibleProvider(normalizedConfig.modelName);
    }

    const result = await generateText({
      model,
      messages: [
        {
          role: "system",
          content: "This is a test req, you only need to say word 'ok'",
        },
        {
          role: "user",
          content: "test",
        },
      ],
      temperature: normalizedConfig.temperature,
    });

    return NextResponse.json({
      success: true,
      response: result.text,
      provider: normalizedConfig.providerType,
    });
  } catch (error: unknown) {
    logger.error("测试请求失败", { error });
    return NextResponse.json(
      {
        success: false,
        error: (error as Error)?.message || "测试请求失败，请检查配置是否正确",
      },
      { status: 500 },
    );
  }
}
