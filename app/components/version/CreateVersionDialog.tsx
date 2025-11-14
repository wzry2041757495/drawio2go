"use client";

import React from "react";
import {
  Button,
  TextField,
  Input,
  TextArea,
  Label,
  Description,
  Spinner,
} from "@heroui/react";
import { useStorageXMLVersions } from "@/app/hooks/useStorageXMLVersions";
import { X, Sparkles } from "lucide-react";

interface CreateVersionDialogProps {
  projectUuid: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionCreated?: () => void;
}

/**
 * 创建版本对话框组件
 * 提供表单让用户输入版本号和描述，创建新的版本快照
 */
export function CreateVersionDialog({
  projectUuid,
  isOpen,
  onClose,
  onVersionCreated,
}: CreateVersionDialogProps) {
  const [versionNumber, setVersionNumber] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [validationError, setValidationError] = React.useState("");
  const [checkingExists, setCheckingExists] = React.useState(false);

  const {
    createHistoricalVersion,
    getRecommendedVersion,
    validateVersion,
    isVersionExists,
  } = useStorageXMLVersions();

  // 处理创建版本（使用 useCallback 避免每次渲染重新创建）
  const handleCreate = React.useCallback(async () => {
    setError("");

    // 最终验证（实时验证已完成大部分工作）
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!versionNumber.trim()) {
      setError("请输入版本号");
      return;
    }

    // 创建版本
    setIsCreating(true);
    try {
      await createHistoricalVersion(
        projectUuid,
        versionNumber.trim(),
        description.trim() || undefined,
      );

      // 触发版本更新事件
      window.dispatchEvent(new Event("version-updated"));

      // 成功后通知父组件并关闭对话框
      onVersionCreated?.();
      onClose();

      // 重置表单
      setVersionNumber("");
      setDescription("");
      setError("");
      setValidationError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建版本失败");
    } finally {
      setIsCreating(false);
    }
  }, [
    validationError,
    versionNumber,
    description,
    createHistoricalVersion,
    projectUuid,
    onVersionCreated,
    onClose,
  ]);

  // 处理智能推荐按钮点击
  const handleRecommend = React.useCallback(async () => {
    try {
      const recommended = await getRecommendedVersion(projectUuid);
      setVersionNumber(recommended);
      setError("");
    } catch (err) {
      console.error("获取推荐版本号失败:", err);
      setError("获取推荐版本号失败");
    }
  }, [projectUuid, getRecommendedVersion]);

  // 加载推荐版本号
  React.useEffect(() => {
    if (isOpen && projectUuid) {
      getRecommendedVersion(projectUuid)
        .then(setVersionNumber)
        .catch((err) => {
          console.error("获取推荐版本号失败:", err);
        });
    }
  }, [isOpen, projectUuid, getRecommendedVersion]);

  // 实时验证版本号（防抖 500ms）
  React.useEffect(() => {
    if (!versionNumber || !versionNumber.trim()) {
      setValidationError("");
      return;
    }

    // 先进行格式验证
    const validation = validateVersion(versionNumber);
    if (!validation.valid) {
      setValidationError(validation.error || "版本号格式错误");
      return;
    }

    // 防抖检查版本号是否已存在
    const timer = setTimeout(async () => {
      setCheckingExists(true);
      try {
        const exists = await isVersionExists(projectUuid, versionNumber);
        if (exists) {
          setValidationError("版本号已存在");
        } else {
          setValidationError("");
        }
      } catch (err) {
        console.error("检查版本号失败:", err);
      } finally {
        setCheckingExists(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [versionNumber, projectUuid, validateVersion, isVersionExists]);

  // 键盘快捷键支持（Enter 提交，Esc 关闭）
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        !isCreating &&
        versionNumber.trim() &&
        !validationError &&
        !checkingExists
      ) {
        e.preventDefault();
        handleCreate();
      } else if (e.key === "Escape" && !isCreating) {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [
    isOpen,
    isCreating,
    versionNumber,
    validationError,
    checkingExists,
    handleCreate,
    onClose,
  ]);

  // 如果对话框未打开，不渲染
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-container" onClick={(e) => e.stopPropagation()}>
        {/* 对话框头部 */}
        <div className="dialog-header">
          <h3 className="text-lg font-semibold">创建新版本</h3>
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label="关闭创建版本对话框"
            onPress={onClose}
            isDisabled={isCreating}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 对话框内容 */}
        <div className="dialog-content">
          {/* 版本号输入 */}
          <TextField className="w-full">
            <Label>版本号 *</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={versionNumber}
                onChange={(e) => setVersionNumber(e.target.value)}
                placeholder="1.0.0"
                className="flex-1"
                disabled={isCreating}
              />
              <Button
                size="sm"
                variant="secondary"
                onPress={handleRecommend}
                isDisabled={isCreating}
              >
                <Sparkles className="w-3.5 h-3.5" />
                智能推荐
              </Button>
            </div>
            {checkingExists ? (
              <Description className="mt-2 flex items-center gap-2 text-blue-600">
                <Spinner size="sm" />
                正在检查版本号...
              </Description>
            ) : validationError ? (
              <Description className="mt-2 text-red-600">
                {validationError}
              </Description>
            ) : versionNumber.trim() ? (
              <Description className="mt-2 text-green-600">
                ✓ 版本号可用
              </Description>
            ) : (
              <Description className="mt-2">
                格式：x.y.z（如 1.0.0）或 x.y.z.h（如 1.0.0.1）
              </Description>
            )}
          </TextField>

          {/* 版本描述输入 */}
          <TextField className="w-full mt-4">
            <Label>版本描述（可选）</Label>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述这个版本的主要变更..."
              rows={4}
              className="mt-2"
              disabled={isCreating}
            />
            <Description className="mt-2">
              简要说明这个版本的更改内容
            </Description>
          </TextField>

          {/* 错误提示 */}
          {error && (
            <div className="error-message mt-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* 对话框底部 */}
        <div className="dialog-footer">
          <Button
            variant="secondary"
            onPress={onClose}
            isDisabled={isCreating}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onPress={handleCreate}
            isDisabled={
              !versionNumber ||
              isCreating ||
              !!validationError ||
              checkingExists
            }
          >
            {isCreating ? (
              <>
                <Spinner size="sm" />
                <span className="ml-2">创建中...</span>
              </>
            ) : (
              "创建版本"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
