"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ImagePart } from "@/app/types/chat";

export interface ImagePreviewProps {
  /**
   * 当前预览的图片 Part；为 null 时表示关闭。
   */
  imagePart: ImagePart | null;
  /**
   * 对应附件的 Object URL（由父组件通过 useAttachmentObjectUrl 获取）。
   */
  objectUrl: string | null;
  onClose: () => void;
  onDownload?: () => void;
}

export default function ImagePreview({
  imagePart,
  objectUrl,
  onClose,
  onDownload,
}: ImagePreviewProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const fileName = useMemo(() => {
    const name = imagePart?.fileName?.trim();
    return name ? name : "image.png";
  }, [imagePart?.fileName]);

  const altText = useMemo(() => {
    const alt = imagePart?.alt?.trim();
    if (alt) return alt;
    const name = imagePart?.fileName?.trim();
    return name ? name : "图片";
  }, [imagePart?.alt, imagePart?.fileName]);

  useEffect(() => {
    if (!imagePart) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imagePart, onClose]);

  if (!imagePart) return null;

  return (
    <div
      className="image-preview"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        animation: "fadeIn var(--duration-medium) var(--ease-out-cubic)",
      }}
    >
      <div
        className="image-preview__backdrop"
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "color-mix(in oklch, var(--black) 90%, transparent)",
        }}
      />

      <div
        className="image-preview__content"
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "var(--spacing-lg)",
        }}
      >
        <div
          className="image-preview__actions"
          style={{
            position: "absolute",
            top: "var(--spacing-md)",
            right: "var(--spacing-md)",
            display: "inline-flex",
            gap: "var(--spacing-sm)",
            zIndex: 1,
          }}
        >
          {objectUrl ? (
            <a
              href={objectUrl}
              download={fileName}
              className="image-preview__download-btn"
              onClick={() => onDownload?.()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border-light)",
                background: "var(--surface)",
                color: "var(--foreground)",
                boxShadow: "var(--shadow-2)",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              下载
            </a>
          ) : null}

          <button
            ref={closeButtonRef}
            type="button"
            className="image-preview__close-btn"
            aria-label="关闭预览"
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "999px",
              border: "1px solid var(--border-light)",
              background: "var(--surface)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-2)",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            padding: "var(--spacing-lg) var(--spacing-md)",
          }}
        >
          {objectUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              className="image-preview__img"
              src={objectUrl}
              alt={altText}
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-4)",
              }}
            />
          ) : (
            <div
              style={{
                color: "var(--text-on-overlay)",
                fontSize: "0.875rem",
              }}
            >
              正在加载图片…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
