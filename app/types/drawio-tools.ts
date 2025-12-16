/**
 * DrawIO XML 操作工具的类型定义
 */

/**
 * 获取 XML 的返回结果（前端存储访问）
 */
export interface GetXMLResult {
  success: boolean;
  xml?: string;
  error?: string;
}

/**
 * 替换 XML 的返回结果（前端存储访问）
 */
export interface ReplaceXMLResult {
  success: boolean;
  message: string;
  error?: string;
  xml?: string;
}

/**
 * XML 验证结果
 */
export interface XMLValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * drawio_read 查询结果的统一类型
 */
export type DrawioQueryResult =
  | DrawioElementResult
  | DrawioAttributeResult
  | DrawioTextResult;

/**
 * 查询结果基类
 */
interface DrawioQueryResultBase {
  matched_xpath: string;
}

export interface DrawioElementResult extends DrawioQueryResultBase {
  type: "element";
  tag_name: string;
  attributes: Record<string, string>;
  xml_string: string;
}

export interface DrawioAttributeResult extends DrawioQueryResultBase {
  type: "attribute";
  name: string;
  value: string;
}

export interface DrawioTextResult extends DrawioQueryResultBase {
  type: "text";
  value: string;
}

/**
 * ls 模式的精简结果，用于列出 mxCell。
 */
export interface DrawioListResult {
  id: string;
  type: "vertex" | "edge" | "unknown";
  attributes: Record<string, string>;
  /** 匹配到的 XPath，便于后续继续操作 */
  matched_xpath: string;
}

/**
 * drawio_read 响应。
 * - XPath / id 查询：返回 DrawioQueryResult[]
 * - ls 模式：返回 DrawioListResult[]
 */
export type DrawioReadResult =
  | {
      success: true;
      results: DrawioQueryResult[];
      list?: undefined;
      error?: undefined;
    }
  | {
      success: true;
      list: DrawioListResult[];
      results?: undefined;
      error?: undefined;
    }
  | {
      success: false;
      error: string;
      results?: undefined;
      list?: undefined;
    };

export interface DrawioEditBatchResult {
  success: true;
  operations_applied: number;
}

/**
 * DrawIO 选中元素信息
 */
export interface DrawioSelectionInfo {
  count: number;
  cells: DrawioCellInfo[];
}

/**
 * DrawIO 单个选中元素信息
 */
export interface DrawioCellInfo {
  id: string;
  type: "vertex" | "edge" | "unknown";
  value: unknown;
  style: string;
  label: string;
  geometry?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

/**
 * ⚠️ 输入参数类型已迁移：
 * - DrawioReadInput / DrawioEditOperation / DrawioEditBatchRequest
 *   请从 `app/lib/schemas/drawio-tool-schemas.ts` 导入 zod 推导类型。
 * 本文件保留结果与 UI 相关类型，作为运行时返回值的单一真源。
 */
