"use client";

import React from "react";
import { deserializeSVGsFromBlob } from "@/app/lib/svg-export-utils";
import { createBlobFromSource, type BinarySource } from "@/app/lib/blob-utils";
import { useStorageXMLVersions } from "./useStorageXMLVersions";
import { parsePageNamesJson } from "@/app/lib/storage/page-metadata-validators";
import type { XMLVersion } from "@/app/lib/storage/types";
import { createLogger } from "@/lib/logger";

const logger = createLogger("useVersionPages");

export interface SVGPage {
  id: string;
  name: string;
  index: number;
  svg: string;
}

export interface UseVersionPagesOptions {
  /** 是否启用加载（可用于懒加载），默认 true */
  enabled?: boolean;
}

export interface UseVersionPagesResult {
  pages: SVGPage[];
  pageNames: string[];
  resolvedVersion: XMLVersion | null;
  hasPagesData: boolean;
  isLoading: boolean;
  error: Error | null;
}

function safeParsePageNames(
  raw?: string | null,
  versionId?: string,
): string[] | undefined {
  if (!raw) return undefined;
  try {
    return parsePageNamesJson(raw);
  } catch (error) {
    logger.warn(
      `page_names 解析失败，已使用兜底名称 (version=${versionId ?? "unknown"})`,
      error,
    );
    return undefined;
  }
}

function normalizePageNames(
  parsedNames: string[] | undefined,
  fallbackNames: string[],
): string[] {
  const length = Math.max(fallbackNames.length, parsedNames?.length ?? 0);
  const result: string[] = [];
  for (let i = 0; i < length; i += 1) {
    const candidate = parsedNames?.[i];
    const fallback = fallbackNames[i] ?? `Page ${i + 1}`;
    result.push(
      typeof candidate === "string" && candidate.trim().length > 0
        ? candidate
        : fallback,
    );
  }
  return result;
}

/**
 * 统一加载版本的多页 SVG 与页面名称。
 * - 自动拉取缺失的 pages_svg（通过 useStorageXMLVersions）
 * - 自动解压并解析 SVG JSON
 * - 合并 page_names 字段并生成兜底名称
 */
export function useVersionPages(
  version: XMLVersion | null | undefined,
  options: UseVersionPagesOptions = {},
): UseVersionPagesResult {
  const { enabled = true } = options;
  const { loadVersionSVGFields } = useStorageXMLVersions();

  const [pages, setPages] = React.useState<SVGPage[]>([]);
  const [pageNames, setPageNames] = React.useState<string[]>([]);
  const [resolvedVersion, setResolvedVersion] =
    React.useState<XMLVersion | null>(version ?? null);
  const [hasPagesData, setHasPagesData] = React.useState(
    Boolean(version?.pages_svg),
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setIsLoading(false);
      setError(null);
      setPages([]);
      setPageNames([]);
      setResolvedVersion(version ?? null);
      setHasPagesData(Boolean(version?.pages_svg));
      return () => {
        cancelled = true;
      };
    }

    if (!version) {
      setIsLoading(false);
      setError(null);
      setPages([]);
      setPageNames([]);
      setResolvedVersion(null);
      setHasPagesData(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    setError(null);
    setHasPagesData(Boolean(version.pages_svg));

    (async () => {
      let workingVersion: XMLVersion | null | undefined = version;
      let workingVersionId = version?.id ?? "unknown";

      try {
        if (!workingVersion.pages_svg) {
          try {
            workingVersion = await loadVersionSVGFields(version);
            workingVersionId = workingVersion?.id ?? workingVersionId;
          } catch (loadError) {
            logger.warn(
              `拉取 pages_svg 失败 (version=${workingVersionId})`,
              loadError,
            );
          }
        }

        const effectiveHasPages = Boolean(workingVersion?.pages_svg);
        setHasPagesData(effectiveHasPages);

        if (!effectiveHasPages) {
          setPages([]);
          setPageNames([]);
          setResolvedVersion(workingVersion ?? null);
          setError(null);
          return;
        }

        if (!workingVersion?.pages_svg) {
          throw new Error("pages_svg 缺失但标记为存在");
        }

        const blob = createBlobFromSource(
          workingVersion.pages_svg as BinarySource,
          "application/json",
        );

        if (!blob) {
          throw new Error("缺少页面 SVG 数据");
        }

        const parsed = await deserializeSVGsFromBlob(blob);

        if (cancelled) return;

        const normalized = parsed
          .map((item, idx) => ({
            id: item.id ?? `page-${idx + 1}`,
            name: typeof item.name === "string" ? item.name.trim() : "",
            index: typeof item.index === "number" ? item.index : idx,
            svg: item.svg ?? "",
          }))
          .filter((page) => page.svg !== undefined && page.svg !== null)
          .sort((a, b) => a.index - b.index);

        if (!normalized.length) {
          throw new Error("未解析到任何页面 SVG");
        }

        const fallbackNames = Array.from(
          {
            length: Math.max(normalized.length, workingVersion.page_count ?? 0),
          },
          (_, idx) =>
            normalized[idx]?.name?.trim().length
              ? normalized[idx].name
              : `Page ${idx + 1}`,
        );

        const mergedNames = normalizePageNames(
          safeParsePageNames(workingVersion.page_names, workingVersionId),
          fallbackNames,
        );

        setPages(normalized);
        setPageNames(mergedNames);
        setResolvedVersion(workingVersion);
      } catch (err) {
        if (cancelled) return;
        const normalizedError =
          err instanceof Error ? err : new Error(String(err));
        const versionId = workingVersionId;
        logger.warn(
          `解析 pages_svg 失败 (version=${versionId})`,
          normalizedError,
        );
        setPages([]);
        setPageNames([]);
        setResolvedVersion(workingVersion ?? version);
        setError(
          new Error(
            normalizedError.message
              ? `Failed to load pages_svg: ${normalizedError.message}`
              : "Failed to load pages_svg",
          ),
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    loadVersionSVGFields,
    version,
    version?.id,
    version?.page_names,
    version?.pages_svg,
  ]);

  return {
    pages,
    pageNames,
    resolvedVersion,
    hasPagesData,
    isLoading,
    error,
  };
}
