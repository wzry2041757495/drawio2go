import { downloadFile, showSaveDialog, writeFile } from "./fileOperations";
import type { ChatUIMessage } from "@/app/types/chat";

const JSON_FILTER = { name: "JSON 文件", extensions: ["json"] };
const MD_FILTER = { name: "Markdown 文件", extensions: ["md"] };

export interface ExportSessionPayload {
  id: string;
  title: string;
  messages: ChatUIMessage[];
  createdAt: number;
  updatedAt: number;
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

const buildMarkdownPayload = (sessions: ExportSessionPayload[]) => {
  const lines: string[] = ["# Chat Export", ""];

  sessions.forEach((session, index) => {
    lines.push(`## 会话 ${index + 1}: ${session.title}`);
    lines.push(
      `- 会话 ID: ${session.id}`,
      `- 创建时间: ${new Date(session.createdAt).toLocaleString()}`,
      `- 更新时间: ${new Date(session.updatedAt).toLocaleString()}`,
      "",
    );

    session.messages.forEach((message) => {
      lines.push(
        `### ${message.role}`,
        "",
        joinTextParts(message) || "(空消息)",
        "",
      );
    });
  });

  return lines.join("\n");
};

const saveContentWithDialog = async (
  content: string,
  defaultFilename: string,
  filter = JSON_FILTER,
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
): Promise<boolean> => {
  const content = buildJsonPayload(sessions);
  return saveContentWithDialog(content, defaultFilename, JSON_FILTER);
};

export const exportSessionsAsMarkdown = async (
  sessions: ExportSessionPayload[],
  defaultFilename: string,
): Promise<boolean> => {
  const content = buildMarkdownPayload(sessions);
  return saveContentWithDialog(content, defaultFilename, MD_FILTER);
};

export const exportBlobContent = async (
  blob: Blob,
  defaultFilename: string,
): Promise<boolean> => {
  const content = await blob.text();
  return saveContentWithDialog(content, defaultFilename, JSON_FILTER);
};
