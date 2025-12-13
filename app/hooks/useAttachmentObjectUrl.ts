"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStorage } from "@/app/lib/storage";
import type { Attachment } from "@/app/lib/storage";
import { withTimeout } from "@/app/lib/utils";
import { createLogger } from "@/lib/logger";

export interface UseAttachmentObjectUrlOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export interface UseAttachmentObjectUrlResult {
  objectUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

const logger = createLogger("useAttachmentObjectUrl");

const READ_TIMEOUT_MS = 5000;
const REVOKE_DELAY_MS = 30_000;
const MAX_CACHE_SIZE = 50;

type CacheEntry = {
  objectUrl: string;
  refCount: number;
  timestamp: number;
  revokeTimer: ReturnType<typeof setTimeout> | null;
};

// 模块级缓存（所有 Hook 实例共享）
const objectUrlCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<string>>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isElectron(): boolean {
  return isBrowser() && !!window.electronStorage;
}

function touchEntry(entry: CacheEntry) {
  entry.timestamp = Date.now();
}

function revokeEntry(attachmentId: string, entry: CacheEntry, reason: string) {
  if (entry.revokeTimer) {
    clearTimeout(entry.revokeTimer);
    entry.revokeTimer = null;
  }

  try {
    URL.revokeObjectURL(entry.objectUrl);
  } catch (error) {
    logger.warn("revoke object url failed", { attachmentId, reason, error });
  } finally {
    objectUrlCache.delete(attachmentId);
  }
}

function scheduleRevokeIfIdle(attachmentId: string, entry: CacheEntry) {
  if (entry.refCount > 0) return;
  if (entry.revokeTimer) return;

  const scheduledAt = Date.now();
  entry.revokeTimer = setTimeout(() => {
    const current = objectUrlCache.get(attachmentId);
    if (!current) return;
    if (current.refCount > 0) {
      current.revokeTimer = null;
      return;
    }
    revokeEntry(attachmentId, current, `idle-timeout:${scheduledAt}`);
  }, REVOKE_DELAY_MS);
}

function evictLRUIfNeeded() {
  if (objectUrlCache.size <= MAX_CACHE_SIZE) return;

  while (objectUrlCache.size > MAX_CACHE_SIZE) {
    let candidateId: string | null = null;
    let candidateEntry: CacheEntry | null = null;

    for (const [id, entry] of objectUrlCache) {
      if (entry.refCount > 0) continue;
      if (!candidateEntry || entry.timestamp < candidateEntry.timestamp) {
        candidateId = id;
        candidateEntry = entry;
      }
    }

    // 如果所有缓存项都在被引用（refCount>0），无法安全淘汰
    if (!candidateId || !candidateEntry) {
      logger.warn("object url cache exceeds limit but all entries are in use", {
        size: objectUrlCache.size,
        limit: MAX_CACHE_SIZE,
      });
      return;
    }

    revokeEntry(candidateId, candidateEntry, "lru-evict");
  }
}

async function readAttachmentWithTimeout(
  attachmentId: string,
): Promise<Attachment> {
  const storage = await withTimeout(
    getStorage(),
    READ_TIMEOUT_MS,
    "初始化存储超时（5秒）",
  );

  const attachment = await withTimeout(
    storage.getAttachment(attachmentId),
    READ_TIMEOUT_MS,
    "读取附件超时（5秒）",
  );

  if (!attachment) {
    throw new Error("附件不存在");
  }

  return attachment;
}

function normalizeBlobFromAttachment(attachment: Attachment): Blob | null {
  const mimeType = attachment.mime_type || "application/octet-stream";
  const data = attachment.blob_data as unknown;

  if (!data) return null;
  if (data instanceof Blob) return data;

  try {
    return new Blob([data as BlobPart], { type: mimeType });
  } catch {
    return null;
  }
}

async function createObjectUrlForAttachment(
  attachmentId: string,
): Promise<string> {
  const attachment = await readAttachmentWithTimeout(attachmentId);
  const mimeType = attachment.mime_type || "application/octet-stream";

  const blob = normalizeBlobFromAttachment(attachment);
  if (blob) {
    return URL.createObjectURL(blob);
  }

  if (isElectron() && attachment.file_path) {
    if (!window.electronFS?.readFile) {
      throw new Error(
        "Electron 文件接口不可用（缺少 window.electronFS.readFile）",
      );
    }

    const arrayBuffer = await withTimeout(
      window.electronFS.readFile(attachment.file_path),
      READ_TIMEOUT_MS,
      "读取附件文件超时（5秒）",
    );

    const fileBlob = new Blob([arrayBuffer], { type: mimeType });
    return URL.createObjectURL(fileBlob);
  }

  throw new Error("附件数据缺失（无 blob_data 且无 file_path）");
}

async function getOrCreateObjectUrl(attachmentId: string): Promise<string> {
  const cached = objectUrlCache.get(attachmentId);
  if (cached) {
    if (cached.revokeTimer) {
      clearTimeout(cached.revokeTimer);
      cached.revokeTimer = null;
    }
    touchEntry(cached);
    return cached.objectUrl;
  }

  const pending = pendingRequests.get(attachmentId);
  if (pending) return pending;

  const request = (async () => {
    const objectUrl = await createObjectUrlForAttachment(attachmentId);
    objectUrlCache.set(attachmentId, {
      objectUrl,
      refCount: 0,
      timestamp: Date.now(),
      revokeTimer: null,
    });
    evictLRUIfNeeded();
    return objectUrl;
  })();

  pendingRequests.set(attachmentId, request);

  request
    .catch(() => undefined)
    .finally(() => {
      if (pendingRequests.get(attachmentId) === request) {
        pendingRequests.delete(attachmentId);
      }
    });

  return request;
}

async function acquireObjectUrl(attachmentId: string): Promise<string> {
  const url = await getOrCreateObjectUrl(attachmentId);
  const entry = objectUrlCache.get(attachmentId);
  if (!entry) {
    throw new Error("附件加载失败：缓存项丢失");
  }

  if (entry.revokeTimer) {
    clearTimeout(entry.revokeTimer);
    entry.revokeTimer = null;
  }

  entry.refCount += 1;
  touchEntry(entry);
  return url;
}

function releaseObjectUrl(attachmentId: string) {
  const entry = objectUrlCache.get(attachmentId);
  if (!entry) return;

  entry.refCount = Math.max(0, entry.refCount - 1);
  touchEntry(entry);

  if (entry.refCount === 0) {
    scheduleRevokeIfIdle(attachmentId, entry);
    evictLRUIfNeeded();
  }
}

export function useAttachmentObjectUrl(
  attachmentId: string | null | undefined,
  options?: UseAttachmentObjectUrlOptions,
): UseAttachmentObjectUrlResult {
  const enabled = options?.enabled ?? true;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const onErrorRef =
    useRef<UseAttachmentObjectUrlOptions["onError"]>(undefined);
  const heldAttachmentIdRef = useRef<string | null>(null);
  const latestStateRef = useRef<{
    objectUrl: string | null;
    error: Error | null;
  }>({ objectUrl: null, error: null });

  useEffect(() => {
    onErrorRef.current = options?.onError;
  }, [options?.onError]);

  useEffect(() => {
    latestStateRef.current = { objectUrl, error };
  }, [objectUrl, error]);

  const releaseHeld = useCallback(() => {
    if (!heldAttachmentIdRef.current) return;
    releaseObjectUrl(heldAttachmentIdRef.current);
    heldAttachmentIdRef.current = null;
  }, []);

  const normalizedAttachmentId = useMemo(() => {
    const trimmed = attachmentId?.trim();
    return trimmed ? trimmed : null;
  }, [attachmentId]);

  useEffect(() => {
    if (!isBrowser()) {
      setObjectUrl(null);
      setIsLoading(false);
      setError(null);
      return () => undefined;
    }

    const id = normalizedAttachmentId;
    const shouldLoad = enabled && !!id;

    // enabled=false 或 id 为空时：释放并清空状态
    if (!shouldLoad) {
      releaseHeld();
      setObjectUrl(null);
      setIsLoading(false);
      setError(null);
      return () => undefined;
    }

    // 同一个 attachmentId 已持有且无错误：只 touch，避免重复 refCount++
    const { objectUrl: latestUrl, error: latestError } = latestStateRef.current;
    if (heldAttachmentIdRef.current === id && !latestError && latestUrl) {
      const cached = objectUrlCache.get(id);
      if (cached) touchEntry(cached);
      setIsLoading(false);
      return () => undefined;
    }

    releaseHeld();

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setObjectUrl(null);

    acquireObjectUrl(id)
      .then((url) => {
        if (cancelled) {
          releaseObjectUrl(id);
          return;
        }
        heldAttachmentIdRef.current = id;
        setObjectUrl(url);
        setIsLoading(false);
      })
      .catch((caught) => {
        if (cancelled) return;
        const nextError =
          caught instanceof Error ? caught : new Error(String(caught));
        logger.warn("load attachment object url failed", {
          attachmentId: id,
          error: nextError,
        });
        setError(nextError);
        setIsLoading(false);
        onErrorRef.current?.(nextError);
      });

    return () => {
      cancelled = true;
      releaseHeld();
    };
  }, [enabled, normalizedAttachmentId, reloadToken, releaseHeld]);

  const retry = useCallback(() => {
    setReloadToken((prev) => prev + 1);
  }, []);

  return useMemo(
    () => ({ objectUrl, isLoading, error, retry }),
    [objectUrl, isLoading, error, retry],
  );
}
