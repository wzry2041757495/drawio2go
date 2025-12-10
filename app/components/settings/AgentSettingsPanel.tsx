"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Button,
  Description,
  FieldError,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import ConfirmDialog from "../common/ConfirmDialog";
import { DEFAULT_SYSTEM_PROMPT } from "@/app/lib/config-utils";

export interface AgentSettingsPanelProps {
  systemPrompt: string;
  onChange: (systemPrompt: string) => void;
  // 可选：由父组件传入的错误信息
  error?: string;
}

export const isSystemPromptValid = (value: string): boolean =>
  value.trim().length > 0;

export const getSystemPromptError = (value: string): string | null =>
  isSystemPromptValid(value) ? null : "系统提示词不能为空";

export default function AgentSettingsPanel({
  systemPrompt,
  onChange,
  error,
}: AgentSettingsPanelProps) {
  const { t } = useTranslation("settings");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleReset = useCallback(() => {
    onChange(DEFAULT_SYSTEM_PROMPT);
  }, [onChange]);

  const derivedError = useMemo(() => {
    if (error) return error;
    return isSystemPromptValid(systemPrompt)
      ? undefined
      : t("agent.systemPrompt.errorEmpty", "系统提示词不能为空");
  }, [error, systemPrompt, t]);

  return (
    <div className="settings-panel flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="section-title">{t("agent.title", "Agent 设置")}</h3>
        <p className="section-description">
          {t("agent.description", "配置 AI 助手的全局行为")}
        </p>
      </div>

      <TextField className="w-full">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-foreground">
              {t("agent.systemPrompt.label", "系统提示词")}
            </Label>
            <Description className="text-sm text-default-500">
              {t(
                "agent.systemPrompt.description",
                "定义 AI 助手的行为规则和工作模式，对所有模型生效",
              )}
            </Description>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onPress={() => setIsResetDialogOpen(true)}
            className="shrink-0"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t("agent.systemPrompt.reset", "恢复默认")}
          </Button>
        </div>

        <TextArea
          value={systemPrompt}
          onChange={(event) => onChange(event.target.value)}
          rows={15}
          aria-label={t("agent.systemPrompt.label", "系统提示词")}
          className="mt-4 w-full min-h-[15rem] max-h-[60vh]"
        />

        {derivedError ? (
          <FieldError className="mt-2 text-sm">{derivedError}</FieldError>
        ) : null}
      </TextField>

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
        title={t("agent.systemPrompt.resetTitle", "恢复默认系统提示词")}
        description={t(
          "agent.systemPrompt.resetConfirm",
          "此操作将丢失当前编辑的内容，确认恢复默认系统提示词吗？",
        )}
        confirmText={t("common.confirm", "确认")}
        cancelText={t("common.cancel", "取消")}
        variant="danger"
        onConfirm={handleReset}
      />
    </div>
  );
}
