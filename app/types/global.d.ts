/**
 * 全局类型声明
 *
 * 用于声明挂载到 global 对象上的变量
 */

import type {
  Setting,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  XMLVersion,
  XMLVersionSVGData,
  CreateXMLVersionInput,
  Conversation,
  CreateConversationInput,
  UpdateConversationInput,
  Message,
  CreateMessageInput,
  Attachment,
  CreateAttachmentInput,
} from "@/lib/storage/types";

declare global {
  /**
   * Electron API
   * 通过 preload.js 注入的 API
   */
  interface Window {
    electron?: {
      checkForUpdates: () => Promise<null | {
        hasUpdate: boolean;
        currentVersion: string;
        latestVersion: string;
        releaseUrl: string;
        releaseNotes?: string;
      }>;
      openReleasePage: (url: string) => Promise<void>;
      onUpdateAvailable: (
        callback: (result: {
          hasUpdate: boolean;
          currentVersion: string;
          latestVersion: string;
          releaseUrl: string;
          releaseNotes?: string;
        }) => void,
      ) => () => void;
      selectFolder: () => Promise<string | null>;
      saveDiagram: (
        xml: string,
        defaultPath?: string,
      ) => Promise<{ success: boolean; message?: string; filePath?: string }>;
      loadDiagram: () => Promise<{
        success: boolean;
        xml?: string;
        filePath?: string;
        message?: string;
      }>;
      openExternal: (url: string) => Promise<void>;
      showSaveDialog: (options: {
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<string | null>;
      showOpenDialog: (options: {
        filters?: { name: string; extensions: string[] }[];
        properties?: string[];
      }) => Promise<string[] | null>;
      writeFile: (
        filePath: string,
        data: string,
      ) => Promise<{ success: boolean; error?: string }>;
      readFile: (filePath: string) => Promise<string>;
      enableSelectionWatcher: () => Promise<{
        success: boolean;
        message?: string;
      }>;
    };

    /**
     * Electron 文件系统 IPC 接口（二进制）
     * 仅在 Electron 环境下可用
     */
    electronFS?: {
      /**
       * 读取 userData 目录下的二进制文件（返回 ArrayBuffer）
       * 主要用于 attachments.file_path（相对路径）
       */
      readFile: (filePath: string) => Promise<ArrayBuffer>;
    };

    /**
     * Electron 存储 IPC 接口
     * 仅在 Electron 环境下可用
     */
    electronStorage?: {
      // 初始化
      initialize: () => Promise<void>;

      // Settings
      getSetting: (key: string) => Promise<string | null>;
      setSetting: (key: string, value: string) => Promise<void>;
      deleteSetting: (key: string) => Promise<void>;
      getAllSettings: () => Promise<Setting[]>;

      // Projects
      getProject: (uuid: string) => Promise<Project | null>;
      createProject: (project: CreateProjectInput) => Promise<Project>;
      updateProject: (
        uuid: string,
        updates: UpdateProjectInput,
      ) => Promise<void>;
      deleteProject: (uuid: string) => Promise<void>;
      getAllProjects: () => Promise<Project[]>;

      // XMLVersions
      getXMLVersion: (
        id: string,
        projectUuid?: string,
      ) => Promise<XMLVersion | null>;
      createXMLVersion: (version: CreateXMLVersionInput) => Promise<XMLVersion>;
      getXMLVersionsByProject: (projectUuid: string) => Promise<XMLVersion[]>;
      getXMLVersionSVGData: (
        id: string,
        projectUuid?: string,
      ) => Promise<XMLVersionSVGData | null>;
      updateXMLVersion: (
        id: string,
        updates: Partial<Omit<XMLVersion, "id">>,
      ) => Promise<void>;
      deleteXMLVersion: (id: string, projectUuid?: string) => Promise<void>;

      // Conversations
      getConversation: (id: string) => Promise<Conversation | null>;
      createConversation: (
        conversation: CreateConversationInput,
      ) => Promise<Conversation>;
      updateConversation: (
        id: string,
        updates: UpdateConversationInput,
      ) => Promise<void>;
      setConversationStreaming: (
        id: string,
        isStreaming: boolean,
      ) => Promise<void>;
      deleteConversation: (id: string) => Promise<void>;
      batchDeleteConversations: (ids: string[]) => Promise<void>;
      exportConversations: (ids: string[]) => Promise<string>;
      getConversationsByProject: (
        projectUuid: string,
      ) => Promise<Conversation[]>;

      // Messages
      getMessagesByConversation: (conversationId: string) => Promise<Message[]>;
      createMessage: (message: CreateMessageInput) => Promise<Message>;
      deleteMessage: (id: string) => Promise<void>;
      createMessages: (messages: CreateMessageInput[]) => Promise<Message[]>;

      // Attachments
      getAttachment: (id: string) => Promise<Attachment | null>;
      createAttachment: (
        attachment: Omit<CreateAttachmentInput, "blob_data"> & {
          blob_data?: ArrayBuffer;
        },
      ) => Promise<Attachment>;
      deleteAttachment: (id: string) => Promise<void>;
      getAttachmentsByMessage: (messageId: string) => Promise<Attachment[]>;
      getAttachmentsByConversation: (
        conversationId: string,
      ) => Promise<Attachment[]>;
    };
  }
}

declare module "xpath" {
  import type { Document, Node } from "@xmldom/xmldom";

  export type XPathValue = Node | string | number | boolean;

  export function select(
    expression: string,
    node: Node | Document,
  ): XPathValue | XPathValue[];
}

declare module "pako";

export {};
