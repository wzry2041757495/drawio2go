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
  FieldError,
} from "@heroui/react";
import {
  useStorageXMLVersions,
  type CreateHistoricalVersionResult,
} from "@/app/hooks/useStorageXMLVersions";
import { X, Sparkles } from "lucide-react";
import type { DrawioEditorRef } from "@/app/components/DrawioEditorNative";

interface CreateVersionDialogProps {
  projectUuid: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionCreated?: (result: CreateHistoricalVersionResult) => void;
  editorRef: React.RefObject<DrawioEditorRef | null>;
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
  editorRef,
}: CreateVersionDialogProps) {
  const [versionNumber, setVersionNumber] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [validationError, setValidationError] = React.useState("");
  const [checkingExists, setCheckingExists] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState<{
    current: number;
    total: number;
    name?: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = React.useState("");
  const closeTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const {
    createHistoricalVersion,
    getRecommendedVersion,
    validateVersion,
    isVersionExists,
  } = useStorageXMLVersions();

  const handleDialogClose = React.useCallback(() => {
    if (isCreating) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setSuccessMessage("");
    setExportProgress(null);
    onClose();
  }, [isCreating, onClose]);

  const handleCreate = React.useCallback(async () => {
    setError("");
    setSuccessMessage("");
    setExportProgress(null);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!versionNumber.trim()) {
      setError("请输入版本号");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createHistoricalVersion(
        projectUuid,
        versionNumber.trim(),
        description.trim() || undefined,
        editorRef,
        {
          onExportProgress: (progress) => {
            setExportProgress({
              current: progress.index + 1,
              total: progress.total,
              name: progress.name,
            });
          },
        },
      );

      window.dispatchEvent(new Event("version-updated"));
      onVersionCreated?.(result);

      const successText = result.svgAttached
        ? `版本创建成功！共 ${result.pageCount} 页，已缓存 SVG 预览。`
        : `版本创建成功！共 ${result.pageCount} 页，SVG 导出失败已自动降级。`;
      setSuccessMessage(successText);

      setVersionNumber("");
      setDescription("");
      setValidationError("");
      setExportProgress(null);

      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = setTimeout(() => {
        setSuccessMessage("");
        handleDialogClose();
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建版本失败");
    } finally {
      setIsCreating(false);
      setExportProgress(null);
    }
  }, [
    validationError,
    versionNumber,
    description,
    createHistoricalVersion,
    projectUuid,
    editorRef,
    onVersionCreated,
    handleDialogClose,
  ]);

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

  React.useEffect(() => {
    if (isOpen && projectUuid) {
      setSuccessMessage("");
      setExportProgress(null);
      getRecommendedVersion(projectUuid)
        .then(setVersionNumber)
        .catch((err) => {
          console.error("获取推荐版本号失败:", err);
        });
    }
  }, [isOpen, projectUuid, getRecommendedVersion]);

  React.useEffect(() => {
    if (!versionNumber || !versionNumber.trim()) {
      setValidationError("");
      return;
    }

    const validation = validateVersion(versionNumber);
    if (!validation.valid) {
      setValidationError(validation.error || "版本号格式错误");
      return;
    }

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

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

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
        handleDialogClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    isCreating,
    versionNumber,
    validationError,
    checkingExists,
    handleCreate,
    handleDialogClose,
  ]);

  React.useEffect(() => {
    if (!isOpen) {
      setError("");
      setValidationError("");
      setSuccessMessage("");
      setExportProgress(null);
    }
  }, [isOpen]);

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleDialogClose}>
      <div className="dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="text-lg font-semibold">创建新版本</h3>
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label="关闭创建版本对话框"
            onPress={handleDialogClose}
            isDisabled={isCreating}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="dialog-content">
          <TextField
            className="w-full"
            isRequired
            isInvalid={!!validationError}
          >
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
              <FieldError className="mt-2">{validationError}</FieldError>
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

          {error && (
            <div className="error-message mt-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {successMessage && !isCreating && (
            <div className="success-message mt-4 text-sm text-green-600">
              {successMessage}
            </div>
          )}

          {isCreating && (
            <div className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
              {exportProgress?.total ? (
                <span>
                  正在导出第 {exportProgress.current}/{exportProgress.total} 页
                  {exportProgress.name ? `（${exportProgress.name}）` : ""}...
                </span>
              ) : (
                <span>正在导出 SVG 并保存版本，请稍候...</span>
              )}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <Button
            variant="secondary"
            onPress={handleDialogClose}
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
