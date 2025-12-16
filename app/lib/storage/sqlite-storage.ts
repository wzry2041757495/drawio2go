import type { StorageAdapter } from "./adapter";
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
} from "./types";
import { WIP_VERSION } from "./constants";
import {
  assertValidSvgBinary,
  resolvePageMetadataFromXml,
} from "./page-metadata-validators";
import { createLogger } from "@/lib/logger";
import { dispatchConversationEvent } from "./event-utils";

const logger = createLogger("SQLiteStorage");

/** 用于 Blob 字段的联合类型（Electron 环境下可能是 Buffer/ArrayBuffer） */
type BlobFieldValue = Blob | Buffer | ArrayBuffer | null;

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.warn("Failed to parse metadata", { error });
      return null;
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeBlobField(
  preview: Blob | Buffer | ArrayBuffer | null | undefined,
): Blob | undefined {
  if (!preview) return undefined;
  if (preview instanceof Blob) return preview;
  const buffer = preview as ArrayBuffer;
  return new Blob([buffer]);
}

/**
 * SQLite 存储实现（Electron 环境）
 * 通过 IPC 调用主进程的 SQLiteManager
 */
export class SQLiteStorage implements StorageAdapter {
  private async ensureElectron() {
    if (!window.electronStorage) {
      throw new Error(
        "electronStorage is not available. Not in Electron environment.",
      );
    }
  }

  private normalizeVersion(
    version:
      | (XMLVersion & {
          metadata?: unknown;
          preview_image?: unknown;
          preview_svg?: unknown;
          pages_svg?: unknown;
        })
      | null,
  ): XMLVersion | null {
    if (!version) return null;
    return {
      ...version,
      metadata: parseMetadata((version as { metadata?: unknown }).metadata),
      preview_image: normalizeBlobField(
        (version as { preview_image?: BlobFieldValue }).preview_image,
      ),
      preview_svg: normalizeBlobField(
        (version as { preview_svg?: BlobFieldValue }).preview_svg,
      ),
      pages_svg: normalizeBlobField(
        (version as { pages_svg?: BlobFieldValue }).pages_svg,
      ),
    };
  }

  async initialize(): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.initialize();
  }

  // ==================== Settings ====================

  async getSetting(key: string): Promise<string | null> {
    await this.ensureElectron();
    return window.electronStorage!.getSetting(key);
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.setSetting(key, value);
  }

  async deleteSetting(key: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.deleteSetting(key);
  }

  async getAllSettings(): Promise<Setting[]> {
    await this.ensureElectron();
    return window.electronStorage!.getAllSettings();
  }

  // ==================== Projects ====================

  async getProject(uuid: string): Promise<Project | null> {
    await this.ensureElectron();
    return window.electronStorage!.getProject(uuid);
  }

  async createProject(project: CreateProjectInput): Promise<Project> {
    await this.ensureElectron();
    return window.electronStorage!.createProject(project);
  }

  async updateProject(
    uuid: string,
    updates: UpdateProjectInput,
  ): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.updateProject(uuid, updates);
  }

  async deleteProject(uuid: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.deleteProject(uuid);
  }

  async getAllProjects(): Promise<Project[]> {
    await this.ensureElectron();
    return window.electronStorage!.getAllProjects();
  }

  // ==================== XMLVersions ====================

  async getXMLVersion(
    id: string,
    projectUuid?: string,
  ): Promise<XMLVersion | null> {
    await this.ensureElectron();
    const result = await window.electronStorage!.getXMLVersion(id, projectUuid);
    const normalized = this.normalizeVersion(result);

    if (normalized && projectUuid && normalized.project_uuid !== projectUuid) {
      const message =
        `安全错误：版本 ${id} 不属于当前项目 ${projectUuid}。` +
        `该版本属于项目 ${normalized.project_uuid}，已拒绝访问。`;
      logger.error("拒绝跨项目访问", {
        versionId: id,
        requestedProject: projectUuid,
        versionProject: normalized.project_uuid,
      });
      throw new Error(message);
    }

    return normalized;
  }

  async createXMLVersion(version: CreateXMLVersionInput): Promise<XMLVersion> {
    await this.ensureElectron();
    assertValidSvgBinary(version.preview_svg, "preview_svg");
    assertValidSvgBinary(version.pages_svg, "pages_svg");

    // Blob → ArrayBuffer 转换
    const versionToCreate: CreateXMLVersionInput = { ...version };
    if (version.preview_image instanceof Blob) {
      versionToCreate.preview_image =
        (await version.preview_image.arrayBuffer()) as unknown as Blob;
    }
    if (version.preview_svg instanceof Blob) {
      versionToCreate.preview_svg =
        (await version.preview_svg.arrayBuffer()) as unknown as Blob;
    }
    if (version.pages_svg instanceof Blob) {
      versionToCreate.pages_svg =
        (await version.pages_svg.arrayBuffer()) as unknown as Blob;
    }

    const { pageCount, pageNamesJson } = resolvePageMetadataFromXml({
      xmlContent: versionToCreate.xml_content,
      userPageCount: versionToCreate.page_count,
      userPageNames: versionToCreate.page_names,
    });
    versionToCreate.page_count = pageCount;
    versionToCreate.page_names = pageNamesJson;

    const result =
      await window.electronStorage!.createXMLVersion(versionToCreate);
    return this.normalizeVersion(result)!;
  }

  async getXMLVersionsByProject(projectUuid: string): Promise<XMLVersion[]> {
    await this.ensureElectron();
    const results =
      await window.electronStorage!.getXMLVersionsByProject(projectUuid);
    return results
      .map((version) => this.normalizeVersion(version))
      .filter((v): v is XMLVersion => !!v)
      .map((version) => {
        const rest: XMLVersion = { ...version };
        delete rest.preview_svg;
        delete rest.pages_svg;
        return rest;
      });
  }

  async getXMLVersionSVGData(
    id: string,
    projectUuid?: string,
  ): Promise<XMLVersionSVGData | null> {
    await this.ensureElectron();
    const svgData = await window.electronStorage!.getXMLVersionSVGData(
      id,
      projectUuid,
    );
    if (!svgData) return null;

    const normalize = (value: Blob | Buffer | ArrayBuffer | null | undefined) =>
      normalizeBlobField(value) ?? null;

    if (
      projectUuid &&
      svgData.project_uuid &&
      svgData.project_uuid !== projectUuid
    ) {
      const message =
        `安全错误：版本 ${id} 的 SVG 数据属于项目 ${svgData.project_uuid}，` +
        `与请求的项目 ${projectUuid} 不一致。`;
      logger.error("拒绝跨项目 SVG 访问", {
        versionId: id,
        requestedProject: projectUuid,
        versionProject: svgData.project_uuid,
      });
      throw new Error(message);
    }

    return {
      id: svgData.id,
      project_uuid: svgData.project_uuid,
      preview_svg: normalize(svgData.preview_svg),
      pages_svg: normalize(svgData.pages_svg),
    };
  }

  async updateXMLVersion(
    id: string,
    updates: Partial<Omit<XMLVersion, "id" | "created_at">>,
  ): Promise<void> {
    await this.ensureElectron();
    const existingRaw = await window.electronStorage!.getXMLVersion(id);
    const existing = this.normalizeVersion(existingRaw);
    if (!existing) {
      throw new Error(`XML Version not found: ${id}`);
    }

    assertValidSvgBinary(updates.preview_svg as Blob, "preview_svg");
    assertValidSvgBinary(updates.pages_svg as Blob, "pages_svg");

    const targetXml = updates.xml_content ?? existing.xml_content;
    const { pageCount, pageNamesJson } = resolvePageMetadataFromXml({
      xmlContent: targetXml,
      userPageCount: updates.page_count,
      userPageNames: updates.page_names,
    });

    const updatesToSend: Partial<Omit<XMLVersion, "id" | "created_at">> & {
      created_at?: number;
    } = {
      ...updates,
      page_count: pageCount,
      page_names: pageNamesJson,
    };

    const targetSemanticVersion =
      updates.semantic_version ?? existing.semantic_version;
    if (
      targetSemanticVersion === WIP_VERSION &&
      updatesToSend.created_at === undefined
    ) {
      updatesToSend.created_at = Date.now();
    }

    // Blob → ArrayBuffer 转换（如果有 preview_image）
    if (updates.preview_image instanceof Blob) {
      updatesToSend.preview_image =
        (await updates.preview_image.arrayBuffer()) as unknown as Blob;
    }
    if (updates.preview_svg instanceof Blob) {
      updatesToSend.preview_svg =
        (await updates.preview_svg.arrayBuffer()) as unknown as Blob;
    }
    if (updates.pages_svg instanceof Blob) {
      updatesToSend.pages_svg =
        (await updates.pages_svg.arrayBuffer()) as unknown as Blob;
    }

    await window.electronStorage!.updateXMLVersion(id, updatesToSend);
  }

  async deleteXMLVersion(id: string, projectUuid?: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.deleteXMLVersion(id, projectUuid);
  }

  // ==================== Conversations ====================

  async getConversation(id: string): Promise<Conversation | null> {
    await this.ensureElectron();
    return window.electronStorage!.getConversation(id);
  }

  async createConversation(
    conversation: CreateConversationInput,
  ): Promise<Conversation> {
    await this.ensureElectron();
    const payload: CreateConversationInput = {
      ...conversation,
      is_streaming: conversation.is_streaming ?? false,
      streaming_since: conversation.streaming_since ?? null,
    };
    const created = await window.electronStorage!.createConversation(payload);
    dispatchConversationEvent("conversation-created", {
      projectUuid: created.project_uuid,
      conversationId: created.id,
    });
    return created;
  }

  async updateConversation(
    id: string,
    updates: UpdateConversationInput,
  ): Promise<void> {
    await this.ensureElectron();
    const conversation = await window.electronStorage!.getConversation(id);
    await window.electronStorage!.updateConversation(id, updates);
    dispatchConversationEvent("conversation-updated", {
      projectUuid: conversation?.project_uuid,
      conversationId: id,
    });
  }

  async setConversationStreaming(
    id: string,
    isStreaming: boolean,
  ): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.setConversationStreaming(id, isStreaming);
    const conversation = await window.electronStorage!.getConversation(id);
    dispatchConversationEvent("conversation-updated", {
      projectUuid: conversation?.project_uuid,
      conversationId: id,
    });
  }

  async deleteConversation(id: string): Promise<void> {
    await this.ensureElectron();
    const conversation = await window.electronStorage!.getConversation(id);
    await window.electronStorage!.deleteConversation(id);
    dispatchConversationEvent("conversation-deleted", {
      projectUuid: conversation?.project_uuid,
      conversationId: id,
    });
    dispatchConversationEvent("messages-updated", {
      projectUuid: conversation?.project_uuid,
      conversationId: id,
    });
  }

  async batchDeleteConversations(ids: string[]): Promise<void> {
    await this.ensureElectron();
    if (!ids || ids.length === 0) return;
    const conversations = await Promise.all(
      ids.map((id) => window.electronStorage!.getConversation(id)),
    );
    await window.electronStorage!.batchDeleteConversations(ids);
    conversations.forEach((conversation, index) => {
      const conversationId = ids[index];
      dispatchConversationEvent("conversation-deleted", {
        projectUuid: conversation?.project_uuid,
        conversationId,
        conversationIds: ids,
      });
      dispatchConversationEvent("messages-updated", {
        projectUuid: conversation?.project_uuid,
        conversationId,
        conversationIds: ids,
      });
    });
  }

  async exportConversations(ids: string[]): Promise<Blob> {
    await this.ensureElectron();
    const json = await window.electronStorage!.exportConversations(ids);
    return new Blob([json], { type: "application/json" });
  }

  async getConversationsByProject(
    projectUuid: string,
  ): Promise<Conversation[]> {
    await this.ensureElectron();
    return window.electronStorage!.getConversationsByProject(projectUuid);
  }

  // ==================== Messages ====================

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    await this.ensureElectron();
    return window.electronStorage!.getMessagesByConversation(conversationId);
  }

  async createMessage(message: CreateMessageInput): Promise<Message> {
    await this.ensureElectron();
    const created = await window.electronStorage!.createMessage(message);
    const conversation = await window.electronStorage!.getConversation(
      message.conversation_id,
    );
    dispatchConversationEvent("messages-updated", {
      projectUuid: conversation?.project_uuid,
      conversationId: message.conversation_id,
      messageIds: [created.id],
    });
    return created;
  }

  async deleteMessage(id: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.deleteMessage(id);
    dispatchConversationEvent("messages-updated", {
      messageIds: [id],
    });
  }

  async createMessages(messages: CreateMessageInput[]): Promise<Message[]> {
    await this.ensureElectron();
    const created = await window.electronStorage!.createMessages(messages);
    const conversationIds = Array.from(
      new Set(messages.map((msg) => msg.conversation_id)),
    );

    for (const conversationId of conversationIds) {
      const conversation =
        await window.electronStorage!.getConversation(conversationId);
      const relatedIds = created
        .filter((msg) => msg.conversation_id === conversationId)
        .map((msg) => msg.id);

      dispatchConversationEvent("messages-updated", {
        projectUuid: conversation?.project_uuid,
        conversationId,
        messageIds: relatedIds,
      });
    }

    return created;
  }

  // ==================== Attachments ====================

  async getAttachment(id: string): Promise<Attachment | null> {
    await this.ensureElectron();
    return window.electronStorage!.getAttachment(id);
  }

  async createAttachment(
    attachment: CreateAttachmentInput,
  ): Promise<Attachment> {
    await this.ensureElectron();

    const { blob_data: blobData, ...rest } = attachment;
    const payload: Omit<CreateAttachmentInput, "blob_data"> & {
      blob_data?: ArrayBuffer;
    } = { ...rest };

    const data = blobData as unknown;
    if (data instanceof Blob) {
      payload.blob_data = await data.arrayBuffer();
    } else if (data instanceof ArrayBuffer) {
      payload.blob_data = data;
    } else if (data && ArrayBuffer.isView(data)) {
      const view = new Uint8Array(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      );
      payload.blob_data = view.slice().buffer;
    }

    return window.electronStorage!.createAttachment(payload);
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.ensureElectron();
    await window.electronStorage!.deleteAttachment(id);
  }

  async getAttachmentsByMessage(messageId: string): Promise<Attachment[]> {
    await this.ensureElectron();
    return window.electronStorage!.getAttachmentsByMessage(messageId);
  }

  async getAttachmentsByConversation(
    conversationId: string,
  ): Promise<Attachment[]> {
    await this.ensureElectron();
    return window.electronStorage!.getAttachmentsByConversation(conversationId);
  }
}
