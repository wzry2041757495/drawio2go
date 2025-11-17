"use client";

import { useRef, useCallback } from "react";
import { DrawioEditorRef } from "@/app/components/DrawioEditorNative";
import { useStorageXMLVersions } from "./useStorageXMLVersions";

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
      console.warn("⚠️ 未提供 projectId，返回空 XML");
      return "";
    }

    try {
      console.log(`📂 正在加载工程 ${projectId} 的 XML...`);
      const xml = (await getCurrentXML(projectId)) ?? "";

      if (editorRef.current) {
        editorRef.current.loadDiagram(xml);
        console.log("✅ XML 已加载到编辑器");
      } else {
        console.warn("⚠️ 编辑器引用不可用");
      }

      return xml;
    } catch (error) {
      console.error("❌ 加载 XML 失败:", error);
      throw error;
    }
  }, [projectId, getCurrentXML]);

  /**
   * 从编辑器导出 XML 并保存到存储
   */
  const saveEditorXml = useCallback(async () => {
    if (!projectId) {
      console.warn("⚠️ 未提供 projectId，跳过保存");
      return;
    }

    try {
      if (editorRef.current) {
        console.log("📤 正在导出编辑器 XML...");
        const xml = await editorRef.current.exportDiagram();

        if (xml) {
          console.log(`💾 正在保存 XML 到工程 ${projectId}...`);
          await saveXML(xml, projectId);
          console.log("✅ XML 已保存");
        } else {
          console.warn("⚠️ 导出的 XML 为空");
        }
      } else {
        console.warn("⚠️ 编辑器引用不可用");
      }
    } catch (error) {
      console.error("❌ 保存 XML 失败:", error);
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
        console.warn("⚠️ 未提供 projectId，跳过替换");
        return;
      }

      try {
        if (editorRef.current) {
          console.log("🔄 正在替换编辑器内容...");

          if (forceLoad) {
            editorRef.current.loadDiagram(xml);
          } else {
            editorRef.current.mergeDiagram(xml);
          }

          console.log(`💾 正在保存 XML 到工程 ${projectId}...`);
          await saveXML(xml, projectId);
          console.log("✅ XML 已替换并保存");
        } else {
          console.warn("⚠️ 编辑器引用不可用");
        }
      } catch (error) {
        console.error("❌ 替换 XML 失败:", error);
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
