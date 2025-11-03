"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { Button, TooltipContent, TooltipRoot } from "@heroui/react";
import ReactMarkdown, { type Components as MarkdownComponents } from "react-markdown";
import { useLLMConfig } from "@/app/hooks/useLLMConfig";
import { useChatSessions } from "@/app/hooks/useChatSessions";

const TOOL_LABELS: Record<string, string> = {
  "tool-get_drawio_xml": "获取 DrawIO XML",
  "tool-replace_drawio_xml": "完全替换 DrawIO XML",
  "tool-batch_replace_drawio_xml": "批量替换 DrawIO XML",
};

const TOOL_STATUS_META: Record<
  string,
  { label: string; icon: string; tone: "pending" | "success" | "error" | "info" }
> = {
  "input-streaming": { label: "准备中", icon: "⏳", tone: "pending" },
  "input-available": { label: "等待执行", icon: "🛠️", tone: "pending" },
  "output-available": { label: "成功", icon: "✅", tone: "success" },
  "output-error": { label: "失败", icon: "⚠️", tone: "error" },
};

type ToolMessagePart = {
  type: string;
  state: string;
  toolCallId?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  [key: string]: unknown;
};

const getToolTitle = (type: string) => {
  if (TOOL_LABELS[type]) {
    return TOOL_LABELS[type];
  }

  if (type.startsWith("tool-")) {
    return type.replace("tool-", "");
  }

  return type;
};

const markdownComponents: MarkdownComponents = {
  a({ node, ...props }) {
    return (
      <a
        {...props}
        className="message-link"
        target="_blank"
        rel="noopener noreferrer"
      />
    );
  },
  code({ node, className, children, ...props }) {
    const content = String(children).replace(/\n$/, "");
    const isInline = !className?.includes('language-');

    if (isInline) {
      return (
        <code className={`inline-code ${className ?? ""}`.trim()} {...props}>
          {content}
        </code>
      );
    }

    return (
      <pre className={`code-block ${className ?? ""}`.trim()}>
        <code>{content}</code>
      </pre>
    );
  },
  blockquote({ node, ...props }) {
    return <blockquote className="message-quote" {...props} />;
  },
  ul({ node, ...props }) {
    return <ul className="message-list" {...props} />;
  },
  ol({ node, ...props }) {
    return <ol className="message-list message-list-ordered" {...props} />;
  },
};

const getToolSummary = (part: ToolMessagePart) => {
  switch (part.state) {
    case "input-streaming":
      return "AI 正在准备工具参数";
    case "input-available":
      return "等待客户端执行工具";
    case "output-available":
      return "工具执行完成";
    case "output-error":
      return part.errorText ?? "工具执行失败";
    default:
      return "工具状态更新";
  }
};

interface ToolCallCardProps {
  part: ToolMessagePart;
  expanded: boolean;
  onToggle: () => void;
}

const ToolCallCard = ({ part, expanded, onToggle }: ToolCallCardProps) => {
  const title = getToolTitle(part.type);
  const meta = TOOL_STATUS_META[part.state] ?? {
    label: "未知状态",
    icon: "ℹ️",
    tone: "info" as const,
  };

  const showInput = Boolean(part.input);
  const showOutput = Boolean(part.output);

  return (
    <div
      className={`tool-call-card tool-call-card--${meta.tone} ${
        expanded ? "tool-call-card--expanded" : ""
      }`.trim()}
    >
      <button type="button" className="tool-call-header" onClick={onToggle}>
        <div className="tool-call-title">{title}</div>
        <div className="tool-call-status">
          <span className="tool-call-status-icon" aria-hidden>{meta.icon}</span>
          <span className="tool-call-status-label">{meta.label}</span>
          <svg
            className={`tool-call-chevron ${expanded ? "tool-call-chevron--open" : ""}`.trim()}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      <div className="tool-call-summary">{getToolSummary(part)}</div>
      {expanded ? (
        <div className="tool-call-body">
          {part.state === "output-error" && (
            <div className="tool-call-error-text">{part.errorText ?? "未知错误"}</div>
          )}
          {showInput && (
            <div className="tool-call-section">
              <div className="tool-call-section-title">输入参数</div>
              <pre className="tool-call-json">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}
          {showOutput && (
            <div className="tool-call-section">
              <div className="tool-call-section-title">执行结果</div>
              <pre className="tool-call-json">
                {JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

interface ThinkingBlockProps {
  reasoning: string;
  isStreaming: boolean;
  expanded: boolean;
  onToggle: () => void;
}

const ThinkingBlock = ({ reasoning, isStreaming, expanded, onToggle }: ThinkingBlockProps) => {
  return (
    <div className={`thinking-block ${isStreaming ? 'thinking-block--active' : 'thinking-block--completed'} ${expanded ? 'thinking-block--expanded' : ''}`.trim()}>
      <button type="button" className="thinking-block-header" onClick={onToggle}>
        <div className="thinking-block-title">
          <span className="thinking-block-icon">{isStreaming ? '🤔' : '💡'}</span>
          <span>{isStreaming ? '思考中...' : '思考过程'}</span>
        </div>
        <svg
          className={`thinking-block-chevron ${expanded ? 'thinking-block-chevron--open' : ''}`.trim()}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="thinking-block-body">
          <pre className="thinking-block-content">
            {reasoning || '暂无思考内容'}
          </pre>
        </div>
      )}
    </div>
  );
};

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [input, setInput] = useState("");
  const [expandedToolCalls, setExpandedToolCalls] = useState<Record<string, boolean>>({});
  const [expandedThinkingBlocks, setExpandedThinkingBlocks] = useState<Record<string, boolean>>({});
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { config: llmConfig, isLoading: configLoading, error: configError } = useLLMConfig();

  // 会话管理
  const {
    sessionsData,
    activeSession,
    isLoading: sessionsLoading,
    createSession,
    deleteSession,
    switchSession,
    updateSessionMessages,
    exportSession,
    exportAllSessions,
    importSessions,
  } = useChatSessions();

  // 初始消息（从当前活动会话加载）
  const initialMessages = useMemo(() => {
    return activeSession?.messages || [];
  }, [activeSession?.id]); // 只在会话 ID 变化时重新计算

  // 使用 ref 来跟踪发送消息时的会话ID
  const sendingSessionIdRef = useRef<string | null>(null);

  const { messages, sendMessage, status, error: chatError } = useChat({
    id: activeSession?.id || "default",
    messages: initialMessages,
    onFinish: ({ messages }) => {
      // 使用发送时记录的会话ID，而不是当前的 activeSession.id
      // 这彻底解决了竞态条件问题
      const targetSessionId = sendingSessionIdRef.current;

      if (!targetSessionId) {
        console.error("[ChatSidebar] onFinish: 没有记录的目标会话ID");
        // 开发模式下抛出错误，便于发现问题
        if (process.env.NODE_ENV === 'development') {
          throw new Error('会话消息保存失败：没有记录目标会话ID。这可能是由于组件卸载导致的竞态条件。');
        }
        return;
      }

      // 验证会话是否仍然存在
      const sessionExists = sessionsData?.sessions[targetSessionId];
      if (sessionExists) {
        updateSessionMessages(targetSessionId, messages);
        console.log("[ChatSidebar] 消息已保存到会话:", targetSessionId);

        // 开发模式下检测会话切换情况
        if (process.env.NODE_ENV === 'development' && activeSession?.id !== targetSessionId) {
          console.warn(`[ChatSidebar] 检测到会话切换：消息保存到 ${targetSessionId}，但当前活动会话是 ${activeSession?.id || 'none'}`);
        }
      } else {
        console.error("[ChatSidebar] 目标会话不存在，无法保存消息:", targetSessionId);
        // 开发模式下抛出错误，便于发现问题
        if (process.env.NODE_ENV === 'development') {
          throw new Error(`会话消息保存失败：目标会话 ${targetSessionId} 不存在。`);
        }
      }

      // 清除记录的会话ID
      sendingSessionIdRef.current = null;
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isChatStreaming = status === "submitted" || status === "streaming";

  const submitMessage = async () => {
    if (!input.trim() || !llmConfig || configLoading || isChatStreaming) {
      return;
    }

    // 在发送消息时捕获当前会话ID，避免竞态条件
    const targetSessionId = activeSession?.id;

    if (!targetSessionId) {
      console.error("[ChatSidebar] 无法发送消息：没有活动会话");
      return;
    }

    // 记录发送消息时的会话ID，确保 onFinish 回调使用正确的会话
    sendingSessionIdRef.current = targetSessionId;
    console.log("[ChatSidebar] 开始发送消息到会话:", targetSessionId);

    try {
      await sendMessage({ text: input.trim() }, {
        body: { llmConfig },
      });
      setInput("");
    } catch (error) {
      console.error("[ChatSidebar] 发送消息失败:", error);
      // 发送失败时清除记录的会话ID
      sendingSessionIdRef.current = null;
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage();
  };

  const handleNewChat = () => {
    createSession();
  };

  const handleHistory = () => {
    setShowSessionMenu(!showSessionMenu);
  };

  const handleDeleteSession = () => {
    if (!activeSession || !sessionsData) return;

    // 如果只有一个会话，不允许删除
    if (sessionsData.sessionOrder.length === 1) {
      alert("至少需要保留一个会话");
      return;
    }

    if (confirm(`确定要删除会话 "${activeSession.title}" 吗？`)) {
      deleteSession(activeSession.id);
    }
  };

  const handleExportSession = async () => {
    if (!activeSession) return;

    const jsonData = exportSession(activeSession.id);
    if (!jsonData) return;

    // 使用 Electron 文件对话框
    if (window.electron?.showSaveDialog) {
      try {
        const filePath = await window.electron.showSaveDialog({
          defaultPath: `chat-${activeSession.title}.json`,
          filters: [{ name: "JSON 文件", extensions: ["json"] }],
        });

        if (filePath) {
          await window.electron.writeFile(filePath, jsonData);
          alert("导出成功！");
        }
      } catch (error) {
        console.error("导出失败:", error);
        alert("导出失败");
      }
    } else {
      // 浏览器环境，使用下载
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-${activeSession.title}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportAllSessions = async () => {
    const jsonData = exportAllSessions();
    if (!jsonData) return;

    // 使用 Electron 文件对话框
    if (window.electron?.showSaveDialog) {
      try {
        const filePath = await window.electron.showSaveDialog({
          defaultPath: `all-chats-${new Date().toISOString().split("T")[0]}.json`,
          filters: [{ name: "JSON 文件", extensions: ["json"] }],
        });

        if (filePath) {
          await window.electron.writeFile(filePath, jsonData);
          alert("导出成功！");
        }
      } catch (error) {
        console.error("导出失败:", error);
        alert("导出失败");
      }
    } else {
      // 浏览器环境，使用下载
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all-chats-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportSessions = async () => {
    // 使用 Electron 文件对话框
    if (window.electron?.showOpenDialog) {
      try {
        const filePaths = await window.electron.showOpenDialog({
          filters: [{ name: "JSON 文件", extensions: ["json"] }],
          properties: ["openFile"],
        });

        if (filePaths && filePaths.length > 0) {
          const jsonData = await window.electron.readFile(filePaths[0]);
          const success = importSessions(jsonData);
          if (success) {
            alert("导入成功！");
          } else {
            alert("导入失败，请检查文件格式");
          }
        }
      } catch (error) {
        console.error("导入失败:", error);
        alert("导入失败");
      }
    } else {
      // 浏览器环境，使用文件输入
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          const success = importSessions(text);
          if (success) {
            alert("导入成功！");
          } else {
            alert("导入失败，请检查文件格式");
          }
        }
      };
      input.click();
    }
  };

  const handleVersionControl = () => {
    console.log("版本管理");
    // TODO: 打开版本管理界面
  };

  const handleFileUpload = () => {
    console.log("文件上传");
    // TODO: 打开文件选择器
  };

  const isSendDisabled =
    !input.trim() || isChatStreaming || configLoading || !llmConfig;

  const combinedError = configError || chatError?.message || null;

  return (
    <div className="chat-sidebar-content">
      {/* 消息内容区域 - 无分隔线一体化设计 */}
      <div className="chat-messages-area">
        {/* 会话标题栏 */}
        {activeSession && (
          <div className="chat-session-header">
            <div className="chat-session-title-wrapper">
              <button
                type="button"
                className="chat-session-title-button"
                onClick={handleHistory}
              >
                <span className="chat-session-title">{activeSession.title}</span>
                <svg
                  className={`chat-session-chevron ${showSessionMenu ? "chat-session-chevron--open" : ""}`}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <span className="chat-session-meta">
                {activeSession.messages.length} 条消息
              </span>
            </div>
            <div className="chat-session-actions">
              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleDeleteSession}
                  className="chat-icon-button"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>删除会话</p>
                </TooltipContent>
              </TooltipRoot>

              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleExportSession}
                  className="chat-icon-button"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>导出当前会话</p>
                </TooltipContent>
              </TooltipRoot>

              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleExportAllSessions}
                  className="chat-icon-button"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>导出所有会话</p>
                </TooltipContent>
              </TooltipRoot>

              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleImportSessions}
                  className="chat-icon-button"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>导入会话</p>
                </TooltipContent>
              </TooltipRoot>
            </div>
          </div>
        )}

        {/* 会话选择菜单 */}
        {showSessionMenu && sessionsData && (
          <div className="chat-session-menu">
            {sessionsData.sessionOrder.map((sessionId) => {
              const session = sessionsData.sessions[sessionId];
              const isActive = sessionId === activeSession?.id;
              return (
                <button
                  key={sessionId}
                  type="button"
                  className={`chat-session-menu-item ${isActive ? "chat-session-menu-item--active" : ""}`}
                  onClick={() => {
                    switchSession(sessionId);
                    setShowSessionMenu(false);
                  }}
                >
                  <div className="chat-session-menu-item-title">
                    {session.title}
                  </div>
                  <div className="chat-session-menu-item-meta">
                    {session.messages.length} 条消息 · {new Date(session.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="messages-scroll-area">
          {configLoading ? (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <p className="empty-text">正在加载 LLM 配置</p>
              <p className="empty-hint">请稍候...</p>
            </div>
          ) : !llmConfig ? (
            <div className="empty-state">
              <div className="empty-icon">⚙️</div>
              <p className="empty-text">尚未配置 AI 供应商</p>
              <p className="empty-hint">请在设置中保存连接参数后重试</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p className="empty-text">开始与 AI 助手对话</p>
              <p className="empty-hint">输入消息开始聊天</p>
            </div>
          ) : (
            messages.map((message) => {
              // 从 parts 数组中提取思考内容
              const reasoningParts = message.parts.filter((part: any) => part.type === 'reasoning');
              const reasoning = reasoningParts.map((part: any) => part.text).join('\n');
              const isReasoningStreaming = reasoningParts.some((part: any) => part.state === 'streaming');
              const isStreaming = isReasoningStreaming || (message.role === 'assistant' && status === 'streaming');

              return (
                <div
                  key={message.id}
                  className={`message ${
                    message.role === "user" ? "message-user" : "message-ai"
                  }`}
                >
                  <div className="message-header">
                    <span className="message-role">
                      {message.role === "user" ? "你" : "AI"}
                    </span>
                    <span className="message-time">
                      {new Date().toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="message-content">
                    {/* 如果有思考内容，先渲染思考框 */}
                    {reasoning && message.role === 'assistant' && (
                      <ThinkingBlock
                        reasoning={reasoning}
                        isStreaming={isStreaming}
                        expanded={expandedThinkingBlocks[message.id] ?? false}
                        onToggle={() => setExpandedThinkingBlocks(prev => ({
                          ...prev,
                          [message.id]: !prev[message.id]
                        }))}
                      />
                    )}

                    {message.parts.map((part: any, index: number) => {
                    if (part.type === "text") {
                      return (
                        <div key={`${message.id}-${index}`} className="message-markdown">
                          <ReactMarkdown components={markdownComponents}>
                            {part.text ?? ""}
                          </ReactMarkdown>
                        </div>
                      );
                    }

                    const normalizedPart: ToolMessagePart =
                      part.type === "dynamic-tool"
                        ? {
                            ...part,
                            type: `tool-${part.toolName}`,
                          }
                        : (part as ToolMessagePart);

                    if (
                      typeof normalizedPart.type === "string" &&
                      normalizedPart.type.startsWith("tool-")
                    ) {
                      const baseKey = normalizedPart.toolCallId
                        ? String(normalizedPart.toolCallId)
                        : `${message.id}-${index}`;
                      const expansionKey = `${baseKey}-${normalizedPart.state}`;
                      const isExpanded =
                        expandedToolCalls[expansionKey] ??
                        normalizedPart.state === "output-error";

                      return (
                        <ToolCallCard
                          key={expansionKey}
                          part={normalizedPart}
                          expanded={isExpanded}
                          onToggle={() =>
                            setExpandedToolCalls((prev) => ({
                              ...prev,
                              [expansionKey]: !isExpanded,
                            }))
                          }
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })
        )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 底部输入区域 - 一体化设计 */}
      <div className="chat-input-area">
        {combinedError && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <div className="error-content">
              <div className="error-title">无法发送请求</div>
              <div className="error-message">{combinedError}</div>
              <button
                className="error-retry"
                type="button"
                onClick={() => window.location.reload()}
              >
                刷新页面
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="chat-input-container">
          {/* 多行文本输入框 */}
          <textarea
            placeholder="描述你想要对图表进行的修改，或上传（粘贴）图像来复制图表..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="chat-input-textarea"
            rows={3}
            disabled={configLoading || !llmConfig}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitMessage();
              }
            }}
          />

          {/* 按钮组 */}
          <div className="chat-input-actions">
            {/* 左侧按钮组 */}
            <div className="chat-actions-left">
              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleNewChat}
                  className="chat-icon-button"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>新建聊天</p>
                </TooltipContent>
              </TooltipRoot>

              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleHistory}
                  className="chat-icon-button"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3v5h5"></path>
                    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path>
                    <path d="M12 7v5l4 2"></path>
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>历史对话</p>
                </TooltipContent>
              </TooltipRoot>
            </div>

            {/* 右侧按钮组 */}
            <div className="chat-actions-right">
              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleVersionControl}
                  className="chat-icon-button"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="18" cy="18" r="3"></circle>
                    <circle cx="6" cy="6" r="3"></circle>
                    <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
                    <line x1="6" y1="9" x2="6" y2="21"></line>
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>版本管理</p>
                </TooltipContent>
              </TooltipRoot>

              <TooltipRoot delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  onPress={handleFileUpload}
                  className="chat-icon-button"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                  </svg>
                </Button>
                <TooltipContent placement="top">
                  <p>文件上传</p>
                </TooltipContent>
              </TooltipRoot>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                isDisabled={isSendDisabled}
                className="chat-send-button button-primary"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                {isChatStreaming ? "发送中..." : "发送"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
