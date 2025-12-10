"use client";

import { useRef, useCallback } from "react";
import { DrawioEditorRef } from "@/app/components/DrawioEditorNative";
import { useStorageXMLVersions } from "./useStorageXMLVersions";
import { createLogger } from "@/lib/logger";

const logger = createLogger("useDrawioEditor");

/**
 * DrawIO 编辑器管理 Hook
 *
 * 封装编辑器操作逻辑，集成存储层
 * 提供高层次的编辑器操作接口
 */
export function useDrawioEditor(projectId?: string) {
  const editorRef = useRef<DrawioEditorRef | null>(null);
  const { saveXML, getCurrentXML } = useStorageXMLVersions();

  /**
   * 从存储加载当前工程的 XML 到编辑器
   * @returns 加载的 XML 内容，如果没有 projectId 则返回空字符串
   */
  const loadProjectXml = useCallback(async (): Promise<string> => {
    if (!projectId) {
      logger.warn("未提供 projectId，返回空 XML");
      return "";
    }

    try {
      logger.info("正在加载工程 XML", { projectId });
      const xml = (await getCurrentXML(projectId)) ?? "";

      if (editorRef.current) {
        editorRef.current.loadDiagram(xml);
        logger.info("XML 已加载到编辑器", { projectId });
      } else {
        logger.warn("编辑器引用不可用", { projectId });
      }

      return xml;
    } catch (error) {
      logger.error("加载 XML 失败", { projectId, error });
      throw error;
    }
  }, [projectId, getCurrentXML]);

  /**
   * 从编辑器导出 XML 并保存到存储
   */
  const saveEditorXml = useCallback(async () => {
    if (!projectId) {
      logger.warn("未提供 projectId，跳过保存");
      return;
    }

    try {
      if (editorRef.current) {
        logger.debug("正在导出编辑器 XML", { projectId });
        const xml = await editorRef.current.exportDiagram();

        if (xml) {
          logger.info("正在保存 XML", { projectId });
          await saveXML(xml, projectId);
          logger.info("XML 已保存", { projectId });
        } else {
          logger.warn("导出的 XML 为空", { projectId });
        }
      } else {
        logger.warn("编辑器引用不可用", { projectId });
      }
    } catch (error) {
      logger.error("保存 XML 失败", { projectId, error });
      throw error;
    }
  }, [projectId, saveXML]);

  /**
   * 替换编辑器内容并保存
   *
   * @param xml 新的 XML 内容
   * @param forceLoad 是否强制使用 load 动作（默认 true，完全重载）
   */
  const replaceWithXml = useCallback(
    async (xml: string, forceLoad = true) => {
      if (!projectId) {
        logger.warn("未提供 projectId，跳过替换");
        return;
      }

      try {
        if (editorRef.current) {
          logger.info("正在替换编辑器内容", { projectId, forceLoad });

          if (forceLoad) {
            editorRef.current.loadDiagram(xml);
          } else {
            editorRef.current.mergeDiagram(xml);
          }

          logger.info("正在保存替换后的 XML", { projectId });
          await saveXML(xml, projectId);
          logger.info("XML 已替换并保存", { projectId });
        } else {
          logger.warn("编辑器引用不可用", { projectId });
        }
      } catch (error) {
        logger.error("替换 XML 失败", { projectId, error });
        throw error;
      }
    },
    [projectId, saveXML],
  );

  return {
    editorRef,
    loadProjectXml,
    saveEditorXml,
    replaceWithXml,
  };
}
