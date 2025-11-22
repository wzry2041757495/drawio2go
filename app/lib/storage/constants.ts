/**
 * 存储层常量定义
 *
 * @module storage/constants
 */

// ==================== 默认常量（当前架构） ====================

import {
  DEFAULT_PROJECT_UUID as SHARED_DEFAULT_PROJECT_UUID,
  WIP_VERSION as SHARED_WIP_VERSION,
  ZERO_SOURCE_VERSION_ID as SHARED_ZERO_SOURCE_VERSION_ID,
} from "./constants-shared";

/**
 * 默认工程 UUID
 *
 * 当前实现：单项目模式
 * - 所有数据都存储在固定的 "default" 工程中
 * - 简化用户体验，无需手动管理项目
 * - 适用于个人使用场景
 *
 * 设计原因：
 * - 避免过早引入复杂的项目管理概念
 * - 保持界面简洁，降低学习成本
 * - 当前用户需求集中在单图表编辑
 *
 * 未来扩展（如需要）：
 * - 支持多项目/工作区切换
 * - 添加项目创建、删除、重命名功能
 * - 项目级别的配置隔离
 */
export const DEFAULT_PROJECT_UUID = SHARED_DEFAULT_PROJECT_UUID;

/**
 * 默认 XML 语义化版本号
 *
 * 当前实现：仅保留最新版本
 * - 所有 XML 版本都固定为 "1.0.0"
 * - 每次保存会自动覆盖旧版本
 * - 保持存储空间最小化
 *
 * 设计原因：
 * - 避免版本管理的复杂性
 * - 减少存储空间占用
 * - 简化版本查询逻辑
 *
 * 未来扩展（如需要）：
 * - 实现真实的语义化版本管理
 * - 支持版本历史记录和回滚
 * - 版本比对和差异查看
 * - 自动版本号递增策略
 */
export const DEFAULT_XML_VERSION = "1.0.0";

/**
 * WIP (Work In Progress) 版本号
 *
 * 活跃工作区使用固定的 0.0.0 版本号
 * - 所有编辑操作直接更新此版本
 * - 始终为关键帧（全量存储）
 * - 每个项目只有一个 WIP 版本
 * - 用户可以从 WIP 创建历史版本快照
 *
 * 设计原因：
 * - 将活跃编辑与历史版本分离
 * - 避免频繁创建新版本记录
 * - 保持版本历史的整洁性
 * - 用户明确控制何时创建快照
 */
export const WIP_VERSION = SHARED_WIP_VERSION;

/**
 * 默认首版本号
 *
 * 当项目没有历史版本时，推荐使用此版本号
 * 用于版本号推荐功能的起始值
 */
export const DEFAULT_FIRST_VERSION = "1.0.0";

/**
 * 首个版本的虚拟 UUID
 *
 * 用于标记关键帧的根节点（无父版本）
 */
export const ZERO_SOURCE_VERSION_ID = SHARED_ZERO_SOURCE_VERSION_ID;

/**
 * 触发关键帧重置的差异阈值（相对于原始文档长度）
 * diff 超过 70% 时直接存储完整关键帧
 */
export const DIFF_KEYFRAME_THRESHOLD = 0.7;

/**
 * 触发关键帧重置的最大差异链长度
 */
export const MAX_DIFF_CHAIN_LENGTH = 10;

// ==================== 数据库配置 ====================

/**
 * IndexedDB 数据库名称
 * 用于 Web 环境的客户端存储
 */
export const DB_NAME = "drawio2go";

/**
 * IndexedDB 数据库版本号
 * 变更数据库结构时需要递增此版本号
 */
export const DB_VERSION = 1;

/**
 * Electron SQLite 数据库文件名
 * 存储在用户数据目录（app.getPath('userData')）
 */
export const SQLITE_DB_FILE = "drawio2go.db";

/**
 * SVG Blob 存储大小上限（字节）
 * 约 8MB，用于限制 *压缩后* 的 preview_svg/pages_svg 体积，避免 IndexedDB/SQLite 过载
 */
export const MAX_SVG_BLOB_BYTES = 8 * 1024 * 1024;
