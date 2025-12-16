"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
} from "react";
import { Button, Skeleton } from "@heroui/react";
import { ImageOff, RotateCw } from "lucide-react";
import type { ImagePart } from "@/app/types/chat";
import { useAttachmentObjectUrl } from "@/hooks/useAttachmentObjectUrl";
import { useIntersection } from "@/hooks/useIntersection";
import { toErrorString } from "@/app/lib/error-handler";
import { createLogger } from "@/lib/logger";
import ImagePreview from "./ImagePreview";

const logger = createLogger("ImageContent");

export interface ImageContentProps {
  part: ImagePart;
  messageId: string;
  isUserMessage: boolean;
  className?: string;
}

type NaturalSize = { width: number; height: number };

function formatDimensions(size: NaturalSize | null | undefined): string | null {
  if (!size) return null;
  if (!size.width || !size.height) return null;
  return `${size.width}×${size.height}`;
}

export default function ImageContent({
  part,
  messageId,
  isUserMessage,
  className,
}: ImageContentProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(null);
  const [scrollRoot, setScrollRoot] = useState<Element | null>(null);

  useEffect(() => {
    setScrollRoot(document.querySelector(".messages-scroll-area"));
  }, []);

  const rootRef = useMemo<RefObject<Element | null>>(
    () => ({ current: scrollRoot }),
    [scrollRoot],
  );

  const { ref, isInView, hasEverBeenInView } = useIntersection({
    root: rootRef,
    rootMargin: "300px 0px",
    threshold: 0.01,
  });

  const {
    objectUrl,
    isLoading: isAttachmentLoading,
    error: attachmentError,
    retry,
  } = useAttachmentObjectUrl(part.attachmentId, {
    enabled: isInView,
    onError: (error) => {
      logger.warn("load attachment failed", {
        messageId,
        attachmentId: part.attachmentId,
        error,
      });
    },
  });

  const errorText = useMemo(
    () => (attachmentError ? toErrorString(attachmentError) : null),
    [attachmentError],
  );

  const resolvedSize = useMemo<NaturalSize | null>(() => {
    const width = part.width ?? naturalSize?.width;
    const height = part.height ?? naturalSize?.height;
    if (!width || !height) return null;
    return { width, height };
  }, [naturalSize?.height, naturalSize?.width, part.height, part.width]);

  const aspectRatio = useMemo(() => {
    if (resolvedSize?.width && resolvedSize?.height) {
      return `${resolvedSize.width} / ${resolvedSize.height}`;
    }
    // 未知尺寸时兜底一个稳定比例，避免布局跳动（后续可在样式层统一约束）
    return "16 / 9";
  }, [resolvedSize?.height, resolvedSize?.width]);

  const altText = part.alt?.trim() || part.fileName?.trim() || "图片";

  const isReady = !!objectUrl && !attachmentError;
  const shouldShowLoading =
    !attachmentError && (!isReady || isAttachmentLoading);

  const handleNaturalSize = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (!width || !height) return;
      setNaturalSize((prev) => {
        if (prev?.width === width && prev?.height === height) return prev;
        return { width, height };
      });
    },
    [],
  );

  const handleOpenPreview = useCallback(() => {
    if (!objectUrl) return;
    setPreviewOpen(true);
  }, [objectUrl]);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  const containerClassName = useMemo(() => {
    const parts = [
      "message-image",
      isUserMessage ? "message-image--user" : "message-image--assistant",
      shouldShowLoading ? "message-image--loading" : "",
      attachmentError ? "message-image--error" : "",
      className ?? "",
    ];
    return parts.filter(Boolean).join(" ");
  }, [attachmentError, className, isUserMessage, shouldShowLoading]);

  const metaFileName = part.fileName?.trim() || null;
  const metaDimensions = formatDimensions(resolvedSize);

  const renderFrameContent = (): ReactNode => {
    if (attachmentError) {
      return (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--spacing-sm)",
            padding: "var(--spacing-lg)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "3rem",
              height: "3rem",
              borderRadius: "999px",
              background: "color-mix(in oklch, var(--danger) 18%, transparent)",
              color: "var(--danger)",
            }}
            aria-hidden="true"
          >
            <ImageOff size={20} />
          </div>

          <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            图片加载失败
          </div>
          <div
            style={{
              fontSize: "0.8125rem",
              color: "var(--foreground-secondary)",
              maxWidth: "36rem",
              wordBreak: "break-word",
            }}
          >
            {errorText ?? "未知错误"}
          </div>

          <Button
            variant="secondary"
            onPress={handleRetry}
            className="message-image__retry"
          >
            <span className="flex items-center gap-2">
              <RotateCw size={16} aria-hidden />
              重试
            </span>
          </Button>
        </div>
      );
    }

    if (isReady) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          className="message-image__img"
          src={objectUrl ?? undefined}
          alt={altText}
          onLoad={handleNaturalSize}
          onClick={handleOpenPreview}
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            objectFit: "contain",
            cursor: "zoom-in",
          }}
        />
      );
    }

    if (shouldShowLoading) {
      return (
        <Skeleton
          className="h-full w-full rounded-[var(--radius-lg)]"
          aria-label="图片加载中"
        />
      );
    }

    return null;
  };

  const renderMeta = (): ReactNode => {
    if (!metaFileName && !metaDimensions) {
      return null;
    }

    let metaDimensionsMarginLeft: string | number = 0;
    if (metaFileName) {
      metaDimensionsMarginLeft = "0.5rem";
    }

    return (
      <div className="message-image__meta">
        {metaFileName ? <span title={metaFileName}>{metaFileName}</span> : null}
        {metaDimensions ? (
          <span
            style={{
              marginLeft: metaDimensionsMarginLeft,
              color: "var(--foreground-tertiary)",
              fontSize: "0.8125rem",
            }}
          >
            {metaDimensions}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div
        ref={ref as unknown as RefObject<HTMLDivElement | null>}
        className={containerClassName}
        data-in-view={isInView ? "true" : "false"}
        data-ever-in-view={hasEverBeenInView ? "true" : "false"}
      >
        <div
          className={[
            "message-image__frame",
            // 错误态复用 ToolCallCard 的视觉语义（红色边框/背景）
            attachmentError ? "tool-call-card tool-call-card--error" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            width: "100%",
            aspectRatio,
            overflow: "hidden",
            borderRadius: "var(--radius-lg)",
            background: "var(--bg-secondary)",
          }}
        >
          {renderFrameContent()}
        </div>

        {renderMeta()}
      </div>

      <ImagePreview
        imagePart={previewOpen ? part : null}
        objectUrl={previewOpen ? objectUrl : null}
        onClose={handleClosePreview}
        onDownload={() => {
          logger.info("download image", {
            messageId,
            attachmentId: part.attachmentId,
          });
        }}
      />
    </>
  );
}
