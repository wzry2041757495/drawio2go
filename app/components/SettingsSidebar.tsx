"use client";

import { useState, useEffect } from "react";
import { Button, TextField, Label, Input, Description, TextArea } from "@heroui/react";

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: { defaultPath: string }) => void;
}

// 默认的 DrawIO XML 绘制助手提示词
const DEFAULT_SYSTEM_PROMPT = `你是一个专业的 DrawIO XML 绘制助手。你的任务是帮助用户创建、修改和优化 DrawIO 图表。

你需要：
1. 理解用户对图表的描述和需求
2. 生成或修改符合 DrawIO XML 格式的代码
3. 确保 XML 结构正确，包含必要的元数据、样式和连接关系
4. 提供清晰的节点布局和美观的视觉效果
5. 解释你所做的修改和设计决策

DrawIO XML 基本规范：
- 使用 <mxGraphModel> 作为根元素
- 使用 <mxCell> 定义节点和连接
- 使用 style 属性定义样式（形状、颜色、字体等）
- 使用 mxGeometry 定义位置和大小
- 保持 ID 的唯一性

请始终确保生成的 XML 可以被 DrawIO 正确解析和渲染。`;

interface LLMConfig {
  apiUrl: string;
  apiKey: string;
  temperature: number;
  modelName: string;
  systemPrompt: string;
  useLegacyOpenAIFormat: boolean;
  maxToolRounds: number;
}

export default function SettingsSidebar({ isOpen, onClose, onSettingsChange }: SettingsSidebarProps) {
  const [defaultPath, setDefaultPath] = useState("");
  const [savedPath, setSavedPath] = useState("");

  // LLM 配置状态
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    apiUrl: "https://api.deepseek.com",
    apiKey: "",
    temperature: 0.3,
    modelName: "deepseek-chat",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    useLegacyOpenAIFormat: true, // 默认勾选
    maxToolRounds: 5,
  });
  const [savedLlmConfig, setSavedLlmConfig] = useState<LLMConfig>(llmConfig);

  // 系统提示词弹窗状态
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  // 测试状态
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [hasChanges, setHasChanges] = useState(false);

  // 加载保存的设置
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("defaultPath") || "";
      setDefaultPath(saved);
      setSavedPath(saved);

      // 加载 LLM 配置
      const savedLlmConfigStr = localStorage.getItem("llmConfig");
      if (savedLlmConfigStr) {
        try {
          const parsed = JSON.parse(savedLlmConfigStr);
          // 兼容旧配置：如果没有 maxToolRounds 字段，使用默认值 5
          const configWithDefaults = {
            ...parsed,
            maxToolRounds: parsed.maxToolRounds ?? 5,
          };
          setLlmConfig(configWithDefaults);
          setSavedLlmConfig(configWithDefaults);
          setTempSystemPrompt(parsed.systemPrompt);
        } catch (e) {
          console.error("加载 LLM 配置失败:", e);
        }
      }
    }
  }, []);

  // 监听变化，检测是否有修改
  useEffect(() => {
    const pathChanged = defaultPath !== savedPath;
    const llmConfigChanged = JSON.stringify(llmConfig) !== JSON.stringify(savedLlmConfig);
    setHasChanges(pathChanged || llmConfigChanged);
  }, [defaultPath, savedPath, llmConfig, savedLlmConfig]);

  // 选择文件夹
  const handleSelectFolder = async () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      const result = await (window as any).electron.selectFolder();
      if (result) {
        setDefaultPath(result);
      }
    } else {
      // 浏览器模式下的占位逻辑
      alert("文件夹选择功能仅在 Electron 环境下可用");
    }
  };

  // 保存设置
  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("defaultPath", defaultPath);
      setSavedPath(defaultPath);

      // 保存 LLM 配置
      localStorage.setItem("llmConfig", JSON.stringify(llmConfig));
      setSavedLlmConfig(llmConfig);

      if (onSettingsChange) {
        onSettingsChange({ defaultPath });
      }
    }
  };

  // 取消修改
  const handleCancel = () => {
    setDefaultPath(savedPath);
    setLlmConfig(savedLlmConfig);
    setTempSystemPrompt(savedLlmConfig.systemPrompt);
  };

  // 打开系统提示词编辑弹窗
  const handleOpenPromptModal = () => {
    setTempSystemPrompt(llmConfig.systemPrompt);
    setIsPromptModalOpen(true);
  };

  // 关闭系统提示词编辑弹窗
  const handleClosePromptModal = () => {
    setIsPromptModalOpen(false);
  };

  // 保存系统提示词
  const handleSavePrompt = () => {
    setLlmConfig({ ...llmConfig, systemPrompt: tempSystemPrompt });
    setIsPromptModalOpen(false);
  };

  // 恢复默认系统提示词
  const handleResetPrompt = () => {
    setTempSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  // 测试 LLM 配置
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setIsTestModalOpen(true);

    try {
      const response = await fetch("/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiUrl: llmConfig.apiUrl,
          apiKey: llmConfig.apiKey,
          temperature: llmConfig.temperature,
          modelName: llmConfig.modelName,
          useLegacyOpenAIFormat: llmConfig.useLegacyOpenAIFormat,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: `测试成功！模型响应：${data.response}`,
        });
      } else {
        setTestResult({
          success: false,
          message: `测试失败：${data.error}`,
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `测试失败：${error.message || "网络错误"}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 关闭测试结果弹窗
  const handleCloseTestModal = () => {
    setIsTestModalOpen(false);
    setTestResult(null);
  };

  return (
    <div className="sidebar-container">
      {/* 设置内容区域 */}
      <div className="sidebar-content">
        <div className="settings-section">
          <h3 className="section-title">文件路径配置</h3>
          <p className="section-description">
            设置 DrawIO 文件的默认保存位置
          </p>

          <TextField className="w-full mt-4">
            <Label>默认启动路径</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={defaultPath}
                onChange={(e) => setDefaultPath(e.target.value)}
                placeholder="/path/to/folder"
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                className="button-small-optimized button-secondary"
                onPress={handleSelectFolder}
              >
                浏览
              </Button>
            </div>
            <Description className="mt-2">
              保存文件时将优先使用此路径,仅在 Electron 环境下生效
            </Description>
          </TextField>
        </div>

        {/* LLM 配置区域 */}
        <div className="settings-section">
          <h3 className="section-title">LLM 配置</h3>
          <p className="section-description">
            配置 AI 助手的连接参数和行为
          </p>

          {/* 请求地址 */}
          <TextField className="w-full mt-4">
            <Label>请求地址</Label>
            <Input
              value={llmConfig.apiUrl}
              onChange={(e) =>
                setLlmConfig({ ...llmConfig, apiUrl: e.target.value })
              }
              placeholder="https://api.deepseek.com"
              className="mt-2"
            />
            <Description className="mt-2">
              API 端点地址，默认为 DeepSeek API
            </Description>
          </TextField>

          {/* OpenAI 标准格式开关 */}
          <div className="w-full mt-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label>使用旧式 OpenAI 标准格式</Label>
                <Description className="mt-1">
                  勾选时使用传统的 /v1/chat/completions 格式
                </Description>
              </div>
              <label className="custom-switch">
                <input
                  type="checkbox"
                  checked={llmConfig.useLegacyOpenAIFormat}
                  onChange={(e) =>
                    setLlmConfig({ ...llmConfig, useLegacyOpenAIFormat: e.target.checked })
                  }
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>

          {/* 请求密钥 */}
          <TextField className="w-full mt-4">
            <Label>请求密钥</Label>
            <Input
              type="password"
              value={llmConfig.apiKey}
              onChange={(e) =>
                setLlmConfig({ ...llmConfig, apiKey: e.target.value })
              }
              placeholder="sk-..."
              className="mt-2"
            />
            <Description className="mt-2">
              API 密钥，用于身份验证（留空则不使用密钥）
            </Description>
          </TextField>

          {/* 请求模型名 */}
          <TextField className="w-full mt-4">
            <Label>请求模型名</Label>
            <Input
              value={llmConfig.modelName}
              onChange={(e) =>
                setLlmConfig({ ...llmConfig, modelName: e.target.value })
              }
              placeholder="deepseek-chat"
              className="mt-2"
            />
            <Description className="mt-2">
              使用的模型名称，如 deepseek-chat
            </Description>
          </TextField>

          {/* 请求温度 */}
          <div className="w-full mt-4">
            <Label>请求温度: {llmConfig.temperature.toFixed(2)}</Label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={llmConfig.temperature}
              onChange={(e) =>
                setLlmConfig({
                  ...llmConfig,
                  temperature: parseFloat(e.target.value),
                })
              }
              className="w-full mt-2 temperature-slider"
            />
            <Description className="mt-2">
              控制生成的随机性，范围 0-2，值越大越随机
            </Description>
          </div>

          {/* 最大工具调用轮次 */}
          <div className="w-full mt-4">
            <Label>最大工具调用轮次: {llmConfig.maxToolRounds}</Label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={llmConfig.maxToolRounds}
              onChange={(e) =>
                setLlmConfig({
                  ...llmConfig,
                  maxToolRounds: parseInt(e.target.value),
                })
              }
              className="w-full mt-2 temperature-slider"
            />
            <Description className="mt-2">
              限制 AI 工具调用的最大循环次数，防止无限循环（范围 1-20）
            </Description>
          </div>

          {/* 系统提示词 */}
          <div className="w-full mt-4">
            <Label>系统提示词</Label>
            <Button
              variant="secondary"
              size="sm"
              className="button-small-optimized button-secondary mt-2 w-full"
              onPress={handleOpenPromptModal}
            >
              编辑系统提示词
            </Button>
            <Description className="mt-2">
              定义 AI 助手的行为和角色
            </Description>
          </div>

          {/* 测试按钮 */}
          <div className="w-full mt-4">
            <Button
              variant="primary"
              size="sm"
              className="button-primary mt-2 w-full"
              onPress={handleTest}
              isDisabled={isTesting}
            >
              {isTesting ? "测试中..." : "测试连接"}
            </Button>
            <Description className="mt-2">
              测试当前配置是否正确，发送一个简单的测试请求
            </Description>
          </div>
        </div>
      </div>

      {/* 浮动操作按钮 - 仅在有修改时显示 */}
      {hasChanges && (
        <div className="floating-actions">
          <Button
            variant="ghost"
            size="sm"
            className="sidebar-button"
            onPress={handleCancel}
          >
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="sidebar-button button-primary"
            onPress={handleSave}
          >
            保存
          </Button>
        </div>
      )}

      {/* 系统提示词编辑弹窗 */}
      {isPromptModalOpen && (
        <div className="modal-overlay" onClick={handleClosePromptModal}>
          <div
            className="modal-content prompt-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">编辑系统提示词</h3>
            <TextArea
              value={tempSystemPrompt}
              onChange={(e) => setTempSystemPrompt(e.target.value)}
              placeholder="输入系统提示词..."
              className="prompt-textarea"
              rows={15}
            />
            <div className="modal-actions">
              <Button
                variant="ghost"
                size="sm"
                className="sidebar-button"
                onPress={handleClosePromptModal}
              >
                取消
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="sidebar-button button-secondary"
                onPress={handleResetPrompt}
              >
                恢复默认
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="sidebar-button button-primary"
                onPress={handleSavePrompt}
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 测试结果弹窗 */}
      {isTestModalOpen && (
        <div className="modal-overlay" onClick={handleCloseTestModal}>
          <div
            className="modal-content test-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">测试结果</h3>
            {isTesting ? (
              <div className="test-loading">
                <div className="spinner"></div>
                <p>正在测试连接...</p>
              </div>
            ) : testResult ? (
              <div
                className={`test-result ${
                  testResult.success ? "test-success" : "test-error"
                }`}
              >
                <div className="test-icon">
                  {testResult.success ? "✓" : "✗"}
                </div>
                <p className="test-message">{testResult.message}</p>
              </div>
            ) : null}
            <div className="modal-actions">
              <Button
                variant="primary"
                size="sm"
                className="sidebar-button button-primary"
                onPress={handleCloseTestModal}
                isDisabled={isTesting}
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
