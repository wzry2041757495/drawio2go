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

    return {
      success: true,
      xml,
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
    // 写入 localStorage
    localStorage.setItem(STORAGE_KEY, drawio_xml);

    // 触发更新事件
    triggerUpdateEvent(drawio_xml);

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
 * 对每个 search-replace 对进行唯一性检查，只替换唯一出现的内容
 *
 * @param replacements - 替换对数组，每个对象包含 search 和 replace 字段
 * @returns 详细的批量替换结果报告
 *
 * @example
 * const result = batchReplaceDrawioXML([
 *   { search: 'oldText1', replace: 'newText1' },
 *   { search: 'oldText2', replace: 'newText2' }
 * ]);
 * console.log(`成功替换 ${result.successCount} 条，跳过 ${result.skippedCount} 条`);
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

  // 阶段 1: 唯一性检查
  const validReplacements: Array<{ index: number; replacement: Replacement }> =
    [];

  replacements.forEach((replacement, index) => {
    const { search } = replacement;

    // 检查出现次数
    const regex = new RegExp(escapeRegExp(search), "g");
    const matches = currentXml.match(regex);
    const count = matches ? matches.length : 0;

    if (count === 0) {
      errors.push({
        index,
        search: replacement.search,
        replace: replacement.replace,
        reason: `未找到搜索内容 "${search}"`,
      });
    } else if (count > 1) {
      errors.push({
        index,
        search: replacement.search,
        replace: replacement.replace,
        reason: `搜索内容 "${search}" 在 XML 中出现 ${count} 次，不唯一`,
      });
    } else {
      // count === 1，标记为合法
      validReplacements.push({ index, replacement });
    }
  });

  // 阶段 2: 执行替换
  for (const { replacement } of validReplacements) {
    currentXml = currentXml.replace(replacement.search, replacement.replace);
    successCount++;
  }

  // 阶段 3: 验证替换后的 XML
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

    // 阶段 4: 保存到 localStorage
    try {
      localStorage.setItem(STORAGE_KEY, currentXml);
      triggerUpdateEvent(currentXml);
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
      ? `成功替换 ${successCount} 条，跳过 ${skippedCount} 条`
      : `所有替换均失败，跳过 ${skippedCount} 条`,
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
