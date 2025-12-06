"use client";

import { type ReactNode, useCallback, useId, useRef, useState } from "react";
import {
  Button,
  CloseButton,
  Description,
  Spinner,
  Surface,
} from "@heroui/react";
import {
  Dialog as AriaDialog,
  Heading,
  Modal as AriaModal,
  ModalOverlay,
} from "react-aria-components";

import { createLogger } from "@/lib/logger";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

const logger = createLogger("ConfirmDialog");

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const closingReasonRef = useRef<"confirm" | "cancel" | null>(null);
  const headingId = useId();
  const descriptionId = useId();

  const handleOpenChange = useCallback(
    (open: boolean) => {
      onOpenChange(open);
      if (!open) {
        if (closingReasonRef.current === null) {
          onCancel?.();
        }
        closingReasonRef.current = null;
      }
    },
    [onCancel, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    closingReasonRef.current = "cancel";
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  const handleConfirm = useCallback(async () => {
    if (isConfirming) return;

    setIsConfirming(true);
    closingReasonRef.current = "confirm";
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      closingReasonRef.current = null;
      logger.error("[ConfirmDialog] onConfirm failed", error);
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirming, onConfirm, onOpenChange]);

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      isDismissable
      isKeyboardDismissDisabled={false}
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <AriaModal className="w-full max-w-md px-4">
        <Surface className="w-full rounded-2xl bg-content1 p-5 shadow-2xl outline-none">
          <AriaDialog
            role="alertdialog"
            aria-labelledby={headingId}
            aria-describedby={descriptionId}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <Heading
                id={headingId}
                className="text-lg font-semibold text-foreground"
              >
                {title}
              </Heading>
              <CloseButton aria-label={cancelText} onPress={handleCancel} />
            </div>

            <Description id={descriptionId} className="text-default-600">
              {description}
            </Description>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="tertiary"
                onPress={handleCancel}
                isDisabled={isConfirming}
              >
                {cancelText}
              </Button>
              <Button
                variant={variant === "danger" ? "danger" : "primary"}
                onPress={handleConfirm}
                isDisabled={isConfirming}
              >
                {isConfirming ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    {confirmText}
                  </span>
                ) : (
                  confirmText
                )}
              </Button>
            </div>
          </AriaDialog>
        </Surface>
      </AriaModal>
    </ModalOverlay>
  );
}

export default ConfirmDialog;
