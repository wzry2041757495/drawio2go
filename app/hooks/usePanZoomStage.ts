"use client";

import React from "react";

interface Point {
  x: number;
  y: number;
}

export interface UsePanZoomStageOptions {
  /** 滚轮缩放策略：仅在按下 Ctrl/Cmd 时缩放，或始终缩放 */
  wheelZoomStrategy?: "ctrl-only" | "always";
  /** 允许的最小缩放值（含），默认 0.1 */
  minScale?: number;
  /** 允许的最大缩放值（含），默认 5 */
  maxScale?: number;
  /** 每次缩放的倍率步长，默认 1.2（放大乘以 step，缩小除以 step） */
  zoomStep?: number;
  /** 自定义是否允许平移的判断逻辑，默认 scale > 1.01 时允许 */
  isPanAllowed?: (scale: number) => boolean;
  /** 缩放时是否同步缩放 offset：out-only=仅缩小同步；both=放大/缩小都同步；none=不同步 */
  scaleOffsetStrategy?: "out-only" | "both" | "none";
}

export interface UsePanZoomStageResult {
  scale: number;
  offset: Point;
  isPanning: boolean;
  canPan: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  setOffset: React.Dispatch<React.SetStateAction<Point>>;
  handleWheel: (event: React.WheelEvent<HTMLElement>) => void;
  handlePointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLElement>) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function usePanZoomStage(
  options: UsePanZoomStageOptions = {},
): UsePanZoomStageResult {
  const {
    wheelZoomStrategy = "ctrl-only",
    minScale = 0.1,
    maxScale = 5,
    zoomStep = 1.2,
    isPanAllowed,
    scaleOffsetStrategy = "out-only",
  } = options;

  const [scale, setScaleState] = React.useState(1);
  const [offset, setOffset] = React.useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const pointerStart = React.useRef<{ point: Point; offset: Point } | null>(
    null,
  );

  const canPan = React.useMemo(
    () => (isPanAllowed ? isPanAllowed(scale) : scale > 1.01),
    [isPanAllowed, scale],
  );

  // 当 min/max 变化时收敛当前 scale
  React.useEffect(() => {
    setScaleState((prev) => clamp(prev, minScale, maxScale));
  }, [maxScale, minScale]);

  const setScale = React.useCallback(
    (updater: React.SetStateAction<number>) => {
      setScaleState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        return clamp(next, minScale, maxScale);
      });
    },
    [maxScale, minScale],
  );

  const shouldScaleOffset = React.useCallback(
    (factor: number) => {
      if (scaleOffsetStrategy === "none") return false;
      if (scaleOffsetStrategy === "both") return true;
      return factor < 1; // out-only
    },
    [scaleOffsetStrategy],
  );

  const applyZoom = React.useCallback(
    (factor: number) => {
      setScale((prev) => prev * factor);
      if (shouldScaleOffset(factor)) {
        setOffset((prev) => ({
          x: prev.x * factor,
          y: prev.y * factor,
        }));
      }
    },
    [setScale, shouldScaleOffset],
  );

  const zoomIn = React.useCallback(() => {
    applyZoom(zoomStep);
  }, [applyZoom, zoomStep]);

  const zoomOut = React.useCallback(() => {
    applyZoom(1 / zoomStep);
  }, [applyZoom, zoomStep]);

  const resetView = React.useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setIsPanning(false);
    pointerStart.current = null;
  }, [setScale]);

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLElement>) => {
      if (
        wheelZoomStrategy === "ctrl-only" &&
        !(event.ctrlKey || event.metaKey)
      ) {
        return;
      }
      event.preventDefault();
      const factor = event.deltaY < 0 ? zoomStep : 1 / zoomStep;
      applyZoom(factor);
    },
    [applyZoom, wheelZoomStrategy, zoomStep],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!canPan) return;
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStart.current = {
      point: { x: event.clientX, y: event.clientY },
      offset,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!isPanning || !pointerStart.current) return;
    const dx = event.clientX - pointerStart.current.point.x;
    const dy = event.clientY - pointerStart.current.point.y;
    setOffset({
      x: pointerStart.current.offset.x + dx,
      y: pointerStart.current.offset.y + dy,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
    pointerStart.current = null;
  };

  return {
    scale,
    offset,
    isPanning,
    canPan,
    zoomIn,
    zoomOut,
    resetView,
    setScale,
    setOffset,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
