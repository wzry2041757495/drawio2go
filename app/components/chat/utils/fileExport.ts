import type { TFunction } from "i18next";
import { downloadFile, showSaveDialog, writeFile } from "./fileOperations";
import type { ChatUIMessage } from "@/app/types/chat";
import { formatConversationDate } from "@/app/lib/format-utils";

const getJsonFilter = (t?: TFunction) => ({
  name: t?.("chat:conversations.export.jsonFilter") ?? "JSON file",
  extensions: ["json"],
});

const getMarkdownFilter = (t?: TFunction) => ({
  name: t?.("chat:conversations.export.markdownFilter") ?? "Markdown file",
  extensions: ["md"],
});

export interface ExportSessionPayload {
  id: string;
  title: string;
  messages: ChatUIMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ExportOptions {
  t?: TFunction;
  locale?: string;
}

const joinTextParts = (message: ChatUIMessage): string => {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n");
};

const buildJsonPayload = (sessions: ExportSessionPayload[]) =>
  JSON.stringify(
    {
      version: "1.0",
      exportDate: new Date().toISOString(),
      sessions,
    },
    null,
    2,
  );

const buildMarkdownPayload = (
  sessions: ExportSessionPayload[],
  options?: ExportOptions,
) => {
  const { t, locale } = options ?? {};
  const lines: string[] = [
    `# ${t?.("chat:conversations.export.title") ?? "Chat Export"}`,
    "",
  ];

  sessions.forEach((session, index) => {
    const sectionTitle =
      t?.("chat:conversations.export.sectionTitle", {
        index: index + 1,
        title: session.title,
      }) ?? `Conversation ${index + 1}: ${session.title}`;

    lines.push(`## ${sectionTitle}`);
    lines.push(
      `- ${t?.("chat:conversations.export.sessionId") ?? "Session ID"}: ${session.id}`,
      `- ${t?.("chat:conversations.export.createdAt") ?? "Created at"}: ${formatConversationDate(session.createdAt, "datetime", locale)}`,
      `- ${t?.("chat:conversations.export.updatedAt") ?? "Updated at"}: ${formatConversationDate(session.updatedAt, "datetime", locale)}`,
      "",
    );

    session.messages.forEach((message) => {
      const roleLabel =
        t?.(`chat:messages.roles.${message.role}`) ?? message.role;
      const content =
        joinTextParts(message).trim() ||
        t?.("chat:conversations.export.emptyMessage") ||
        "";

      lines.push(`### ${roleLabel}`, "", content, "");
    });
  });

  return lines.join("\n");
};

const saveContentWithDialog = async (
  content: string,
  defaultFilename: string,
  filter = getJsonFilter(),
): Promise<boolean> => {
  const filePath = await showSaveDialog({
    defaultPath: defaultFilename,
    filters: [filter],
  });

  if (filePath) {
    const success = await writeFile(filePath, content);
    return success;
  }

  downloadFile(content, defaultFilename);
  return true;
};

export const exportSessionsAsJson = async (
  sessions: ExportSessionPayload[],
  defaultFilename: string,
  options?: ExportOptions,
): Promise<boolean> => {
  const content = buildJsonPayload(sessions);
  return saveContentWithDialog(
    content,
    defaultFilename,
    getJsonFilter(options?.t),
  );
};

export const exportSessionsAsMarkdown = async (
  sessions: ExportSessionPayload[],
  defaultFilename: string,
  options?: ExportOptions,
): Promise<boolean> => {
  const content = buildMarkdownPayload(sessions, options);
  return saveContentWithDialog(
    content,
    defaultFilename,
    getMarkdownFilter(options?.t),
  );
};

export const exportBlobContent = async (
  blob: Blob,
  defaultFilename: string,
  options?: ExportOptions,
): Promise<boolean> => {
  const content = await blob.text();
  return saveContentWithDialog(
    content,
    defaultFilename,
    getJsonFilter(options?.t),
  );
};
