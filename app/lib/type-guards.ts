import type { ChatUIMessage, MessageMetadata } from "@/app/types/chat";

export function hasConversationIdMetadata(
  message: ChatUIMessage,
): message is ChatUIMessage & {
  metadata: MessageMetadata & { conversationId: unknown };
} {
  const metadata = message.metadata;
  if (!metadata || typeof metadata !== "object") return false;
  return (
    "conversationId" in metadata &&
    typeof (metadata as { conversationId?: unknown }).conversationId ===
      "string"
  );
}
