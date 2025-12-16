"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

export interface UseIntersectionOptions {
  /**
   * IntersectionObserver 的 root 容器（滚动容器）。
   * 未提供时使用 viewport。
   */
  root?: RefObject<Element | null>;
  rootMargin?: string;
  threshold?: number;
  /**
   * 禁用 IntersectionObserver（测试或强制加载）。
   * disabled=true 时，视为始终在视口内。
   */
  disabled?: boolean;
}

export function useIntersection(options?: UseIntersectionOptions): {
  ref: RefObject<HTMLElement | null>;
  isInView: boolean;
  hasEverBeenInView: boolean;
} {
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasEverBeenInView, setHasEverBeenInView] = useState(false);

  const normalized = useMemo(
    () => ({
      root: options?.root,
      rootMargin: options?.rootMargin ?? "0px",
      threshold: options?.threshold ?? 0,
      disabled: options?.disabled ?? false,
    }),
    [options?.root, options?.rootMargin, options?.threshold, options?.disabled],
  );

  useEffect(() => {
    if (normalized.disabled) {
      setIsInView(true);
      setHasEverBeenInView(true);
      return () => undefined;
    }

    if (typeof window === "undefined") return () => undefined;

    // 缺少 IntersectionObserver 时直接视为可见（避免在旧环境中阻塞加载）
    if (typeof window.IntersectionObserver === "undefined") {
      setIsInView(true);
      setHasEverBeenInView(true);
      return () => undefined;
    }

    const node = ref.current;
    if (!node) return () => undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const nextInView = !!entry?.isIntersecting;
        setIsInView(nextInView);
        if (nextInView) setHasEverBeenInView(true);
      },
      {
        root: normalized.root?.current ?? null,
        rootMargin: normalized.rootMargin,
        threshold: normalized.threshold,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [
    normalized.disabled,
    normalized.root,
    normalized.rootMargin,
    normalized.threshold,
  ]);

  return { ref, isInView, hasEverBeenInView };
}
