import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiUrl, apiKey, temperature, modelName, useLegacyOpenAIFormat } = body;

    // 验证必要参数
    if (!apiUrl || !modelName) {
      return NextResponse.json(
        { error: "缺少必要的配置参数：apiUrl 和 modelName" },
        { status: 400 }
      );
    }

    // 根据开关选择实现方式
    if (useLegacyOpenAIFormat) {
      // 使用传统的 OpenAI 标准格式
      const requestUrl = `${apiUrl.replace(/\/$/, '')}/v1/chat/completions`;

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || 'dummy-key'}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: 'This is a test req, you only need to say word \'ok\'',
            },
            {
              role: 'user',
              content: 'test',
            },
          ],
          temperature: temperature ?? 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return NextResponse.json({
        success: true,
        response: data.choices?.[0]?.message?.content || 'Unknown response',
      });
    } else {
      // 使用 @ai-sdk/openai
      const customProvider = createOpenAI({
        baseURL: apiUrl,
        apiKey: apiKey || "dummy-key", // 如果没有 API key，使用占位符
      });

      const result = await generateText({
        model: customProvider(modelName),
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
        temperature: temperature ?? 0.3,
      });

      return NextResponse.json({
        success: true,
        response: result.text,
      });
    }
  } catch (error: any) {
    console.error("测试请求失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "测试请求失败，请检查配置是否正确",
      },
      { status: 500 }
    );
  }
}
