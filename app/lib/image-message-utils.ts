import type { Attachment } from "@/lib/storage";
import type { StorageAdapter } from "@/lib/storage";
import type { ImagePart } from "@/app/types/chat";
import type { AttachmentItem } from "@/hooks/useImageAttachments";

export async function fileToDataUrl(file: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to dataUrl"));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await fileToDataUrl(blob);
}

export async function uploadImageAttachment(params: {
  storage: StorageAdapter;
  attachmentId: string;
  conversationId: string;
  messageId: string;
  file: File;
  width?: number;
  height?: number;
}): Promise<Attachment> {
  const {
    storage,
    attachmentId,
    conversationId,
    messageId,
    file,
    width,
    height,
  } = params;

  return await storage.createAttachment({
    id: attachmentId,
    message_id: messageId,
    conversation_id: conversationId,
    type: "image",
    mime_type: file.type,
    file_name: file.name,
    file_size: file.size,
    width,
    height,
    blob_data: file,
  });
}

export async function convertAttachmentItemToImagePart(
  item: AttachmentItem,
  attachmentId: string,
): Promise<ImagePart> {
  const file = item.file;

  return {
    type: "image",
    attachmentId,
    mimeType: file.type,
    width: item.width,
    height: item.height,
    fileName: file.name,
    alt: file.name,
    purpose: "vision",
    dataUrl: await fileToDataUrl(file),
  };
}
