/**
 * DrawIO XML 操作工具集
 *
 * 提供三个核心功能：
 * 1. getDrawioXML - 获取当前 XML 内容
 * 2. replaceDrawioXML - 覆写 XML 内容
 * 3. batchReplaceDrawioXML - 批量替换 XML 内容
 */

import type {
  GetXMLResult,
  ReplaceXMLResult,
  BatchReplaceResult,
  Replacement,
  ReplacementError,
  XMLValidationResult,
} from "../types/drawio-tools";

/**
 * localStorage 中存储 DrawIO XML 的键名
 */
const STORAGE_KEY = "currentDiagram";

/**
 * 自定义事件名称��用于通知编辑器重新加载
 */
const UPDATE_EVENT = "drawio-xml-updated";

/**
 * 验证 XML 格式是否合法
 * 使用浏览器内置的 DOMParser 进行验证
 *
 * @param xml - 待验证的 XML 字符串
 * @returns 验证结果，包含是否合法和错误信息
 */
function validateXML(xml: string): XMLValidationResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const parseError = doc.querySelector("parsererror");

    if (parseError) {
      return {
        valid: false,
        error: parseError.textContent || "XML 格式错误",
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "XML 解析异常",
    };
  }
}

/**
 * 解码 base64 编码的 XML 内容
 *
 * 检测并解码 data:image/svg+xml;base64, 前缀的内容
 *
 * @param xml - 原始 XML 字符串（可能包含 base64 编码）
 * @returns 解码后的 XML 字符串，如果不是 base64 格式则返回原始内容
 */
function decodeBase64XML(xml: string): string {
  const prefix = 'data:image/svg+xml;base64,';

  if (xml.startsWith(prefix)) {
    try {
      // 提取 base64 部分
      const base64Content = xml.substring(prefix.length);
      // 解码 base64
      const decoded = atob(base64Content);
      return decoded;
    } catch (error) {
      console.error('[DrawIO Tools] Base64 解码失败:', error);
      return xml; // 解码失败时返回原始内容
    }
  }

  return xml; // 不是 base64 格式，直接返回
}

/**
 * 保存 XML 到 localStorage（自动解码 base64）
 *
 * 统一的保存入口，确保 localStorage 中永远存储解码后的纯 XML
 *
 * @param xml - XML 内容（可能包含 base64 编码）
 */
export function saveDrawioXML(xml: string): void {
  if (typeof window === "undefined") {
    throw new Error('saveDrawioXML 只能在浏览器环境中使用');
  }

  // 自动解码 base64（如果是base64格式）
  const decodedXml = decodeBase64XML(xml);

  // 写入 localStorage（纯XML）
  localStorage.setItem(STORAGE_KEY, decodedXml);

  // 触发更新事件
  triggerUpdateEvent(decodedXml);
}

/**
 * 触发自定义事件，通知组件 XML 已更新
 *
 * @param xml - 更新后的 XML 内容
 */
function triggerUpdateEvent(xml: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(UPDATE_EVENT, {
        detail: { xml },
      })
    );
  }
}

/**
 * 1. 获取当前 DrawIO XML 内容
 *
 * @returns 包含 XML 内容或错误信息的结果对象
 *
 * @example
 * const result = getDrawioXML();
 * if (result.success) {
 *   console.log(result.xml);
 * } else {
 *   console.error(result.error);
 * }
 */
export function getDrawioXML(): GetXMLResult {
  if (typeof window === "undefined") {
    return {
      success: false,
      error: "此函数只能在浏览器环境中使用",
    };
  }

  try {
    const xml = localStorage.getItem(STORAGE_KEY);

    if (!xml) {
      return {
        success: false,
        error: "未找到保存的图表数据",
      };
    }

    // 解码 base64 编码的 XML（如果需要）
    const decodedXml = decodeBase64XML(xml);

    return {
      success: true,
      xml: decodedXml,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "读取数据失败",
    };
  }
}

/**
 * 2. 覆写 DrawIO XML 内容
 *
 * 验证 XML 格式后，将新内容写入 localStorage 并触发重新加载事件
 *
 * @param drawio_xml - 新的 XML 内容
 * @returns 操作结果
 *
 * @example
 * const result = replaceDrawioXML('<mxfile>...</mxfile>');
 * if (result.success) {
 *   console.log('XML 已成功替换');
 * } else {
 *   console.error(result.error);
 * }
 */
export function replaceDrawioXML(drawio_xml: string): ReplaceXMLResult {
  if (typeof window === "undefined") {
    return {
      success: false,
      message: "操作失败",
      error: "此函数只能在浏览器环境中使用",
    };
  }

  // 验证 XML 格式
  const validation = validateXML(drawio_xml);
  if (!validation.valid) {
    return {
      success: false,
      message: "XML 格式验证失败",
      error: validation.error,
    };
  }

  try {
    // 保存到 localStorage（自动解码 base64）
    saveDrawioXML(drawio_xml);

    return {
      success: true,
      message: "XML 内容已成功替换并已通知编辑器重新加载",
    };
  } catch (error) {
    return {
      success: false,
      message: "保存失败",
      error: error instanceof Error ? error.message : "写入数据失败",
    };
  }
}

/**
 * 3. 批量精准替换 XML 内容
 *
 * 对每个 search-replace 对进行全局替换，替换所有匹配的内容
 *
 * @param replacements - 替换对数组，每个对象包含 search 和 replace 字段
 * @returns 详细的批量替换结果报告
 *
 * @example
 * const result = batchReplaceDrawioXML([
 *   { search: 'oldText1', replace: 'newText1' },
 *   { search: 'oldText2', replace: 'newText2' }
 * ]);
 * console.log(`成功替换 ${result.successCount} 条`);
 * result.errors.forEach(err => console.log(`错误: ${err.reason}`));
 */
export function batchReplaceDrawioXML(
  replacements: Replacement[]
): BatchReplaceResult {
  if (typeof window === "undefined") {
    return {
      success: false,
      message: "此函数只能在浏览器环境中使用",
      totalRequested: replacements.length,
      successCount: 0,
      skippedCount: replacements.length,
      errors: replacements.map((r, i) => ({
        index: i,
        search: r.search,
        replace: r.replace,
        reason: "不支持服务端环境",
      })),
    };
  }

  // 获取当前 XML
  const getResult = getDrawioXML();
  if (!getResult.success || !getResult.xml) {
    return {
      success: false,
      message: getResult.error || "获取当前 XML 失败",
      totalRequested: replacements.length,
      successCount: 0,
      skippedCount: replacements.length,
      errors: replacements.map((r, i) => ({
        index: i,
        search: r.search,
        replace: r.replace,
        reason: "无法获取当前 XML 内容",
      })),
    };
  }

  let currentXml = getResult.xml;
  const errors: ReplacementError[] = [];
  let successCount = 0;

  // 执行全局替换
  replacements.forEach((replacement, index) => {
    const { search, replace } = replacement;

    // 检查搜索内容是否存在
    if (!currentXml.includes(search)) {
      errors.push({
        index,
        search,
        replace,
        reason: `未找到搜索内容 "${search}"`,
      });
      return;
    }

    // 使用全局替换替换所有匹配项
    const regex = new RegExp(escapeRegExp(search), "g");
    currentXml = currentXml.replace(regex, replace);
    successCount++;
  });

  // 验证替换后的 XML 格式
  if (successCount > 0) {
    const validation = validateXML(currentXml);
    if (!validation.valid) {
      return {
        success: false,
        message: "替换后的 XML 格式验证失败",
        totalRequested: replacements.length,
        successCount: 0,
        skippedCount: replacements.length,
        errors: [
          {
            index: -1,
            search: "",
            replace: "",
            reason: `XML 验证失败: ${validation.error}`,
          },
          ...errors,
        ],
      };
    }

    // 保存到 localStorage（自动解码 base64）并触发更新事件
    try {
      saveDrawioXML(currentXml);
    } catch (error) {
      return {
        success: false,
        message: "保存失败",
        totalRequested: replacements.length,
        successCount: 0,
        skippedCount: replacements.length,
        errors: [
          {
            index: -1,
            search: "",
            replace: "",
            reason:
              error instanceof Error ? error.message : "写入数据失败",
          },
          ...errors,
        ],
      };
    }
  }

  // 生成结果报告
  const skippedCount = errors.length;
  const allSuccess = skippedCount === 0 && successCount > 0;

  return {
    success: allSuccess,
    message: allSuccess
      ? `成功替换 ${successCount} 条`
      : successCount > 0
      ? `部分成功：成功替换 ${successCount} 条，失败 ${skippedCount} 条`
      : `所有替换均失败，失败 ${skippedCount} 条`,
    totalRequested: replacements.length,
    successCount,
    skippedCount,
    errors,
  };
}

/**
 * 辅助函数：转义正则表达式特殊字符
 *
 * @param string - 需要转义的字符串
 * @returns 转义后的字符串
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 导出事件名称常量，供组件监听使用
 */
export { UPDATE_EVENT };
