import { normalizeLLMConfig } from "@/app/lib/llm-config";
import { LLMConfig } from "@/app/types/chat";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

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
      useLegacyOpenAIFormat: body?.useLegacyOpenAIFormat,
    });

    if (normalizedConfig.providerType === "anthropic") {
      return NextResponse.json(
        { error: "Anthropic 供应商暂未接入测试接口" },
        { status: 400 }
      );
    }

    if (!normalizedConfig.apiUrl || !normalizedConfig.modelName) {
      return NextResponse.json(
        { error: "缺少必要的配置参数：apiUrl 和 modelName" },
        { status: 400 }
      );
    }

    const customProvider = createOpenAI({
      baseURL: normalizedConfig.apiUrl,
      apiKey: normalizedConfig.apiKey || "dummy-key",
      name: normalizedConfig.providerType === "deepseek" ? "deepseek" : undefined,
    });

    const model = normalizedConfig.providerType === "openai-response"
      ? customProvider(normalizedConfig.modelName)
      : customProvider.chat(normalizedConfig.modelName);

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
  } catch (error: any) {
    console.error("测试请求失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "测试请求失败，请检查配置是否正确",
      },
      { status: 500 }
    );
  }
}
