/**
 * DrawIO XML 操作工具的类型定义
 */

/**
 * 获取 XML 的返回结果
 */
export interface GetXMLResult {
  success: boolean;
  xml?: string;
  error?: string;
}

/**
 * 替换 XML 的返回结果
 */
export interface ReplaceXMLResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * 批量替换的单个替换对
 */
export interface Replacement {
  search: string;
  replace: string;
}

/**
 * 批量替换中失败项的错误详情
 */
export interface ReplacementError {
  index: number;
  search: string;
  replace: string;
  reason: string;
}

/**
 * 批量替换的返回结果
 */
export interface BatchReplaceResult {
  success: boolean;
  message: string;
  totalRequested: number;
  successCount: number;
  skippedCount: number;
  errors: ReplacementError[];
}

/**
 * XML 验证结果
 */
export interface XMLValidationResult {
  valid: boolean;
  error?: string;
}
