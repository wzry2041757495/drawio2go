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
 * 定位器基础定义：支持 XPath 与 mxCell id 双重定位。
 * 若两者同时提供，优先使用 id。
 */
export interface LocatorBase {
  xpath?: string;
  id?: string;
  allow_no_match?: boolean;
}

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
 * drawio_read 输入参数
 */
export interface DrawioReadInput {
  /** XPath 精确查询 */
  xpath?: string;
  /** 按 mxCell id 查询，支持单个或多个 */
  id?: string | string[];
  /** ls 模式筛选器，默认 "all" */
  filter?: "all" | "vertices" | "edges";
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

/**
 * drawio_edit_batch 批量操作定义
 */

export interface SetAttributeOperation extends LocatorBase {
  type: "set_attribute";
  key: string;
  value: string;
}

export interface RemoveAttributeOperation extends LocatorBase {
  type: "remove_attribute";
  key: string;
}

export type InsertPosition =
  | "append_child"
  | "prepend_child"
  | "before"
  | "after";

export interface InsertElementOperation extends LocatorBase {
  type: "insert_element";
  new_xml: string;
  position?: InsertPosition;
}

export interface RemoveElementOperation extends LocatorBase {
  type: "remove_element";
}

export interface ReplaceElementOperation extends LocatorBase {
  type: "replace_element";
  new_xml: string;
}

export interface SetTextContentOperation extends LocatorBase {
  type: "set_text_content";
  value: string;
}

export type DrawioEditOperation =
  | SetAttributeOperation
  | RemoveAttributeOperation
  | InsertElementOperation
  | RemoveElementOperation
  | ReplaceElementOperation
  | SetTextContentOperation;

export type DrawioEditBatchRequest = DrawioEditOperation[];

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
