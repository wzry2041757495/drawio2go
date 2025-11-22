"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Conversation, Message } from "@/app/lib/storage";
import { useStorageConversations } from "@/app/hooks";
import HistoryToolbar from "./HistoryToolbar";
import ConversationList from "./ConversationList";
import MessagePreviewPanel from "./MessagePreviewPanel";

interface ChatHistoryViewProps {
  currentProjectId?: string;
  conversations: Conversation[];
  onSelectConversation: (conversationId: string) => void | Promise<void>;
  onBack: () => void;
  onDeleteConversations: (ids: string[]) => void | Promise<void>;
  onExportConversations: (ids: string[]) => void | Promise<void>;
}

interface DateRange {
  start: string;
  end: string;
}

const parseDate = (str: string | null): number | null => {
  if (!str) return null;
  const ts = new Date(str).getTime();
  return isNaN(ts) ? null : ts;
};

export default function ChatHistoryView({
  currentProjectId: _currentProjectId,
  conversations,
  onSelectConversation,
  onBack,
  onDeleteConversations,
  onExportConversations,
}: ChatHistoryViewProps) {
  const { getMessages } = useStorageConversations();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewConversationId, setPreviewConversationId] = useState<
    string | null
  >(null);
  const [previewMessages, setPreviewMessages] = useState<Message[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        conv.title.toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) return false;

      const time = conv.updated_at ?? conv.created_at;
      const start = parseDate(dateRange.start || null);
      if (start !== null && time < start) return false;

      const end = parseDate(dateRange.end || null);
      if (end !== null) {
        const endInclusive = end + 86400000 - 1;
        if (time > endInclusive) return false;
      }
      return true;
    });
  }, [conversations, normalizedQuery, dateRange.start, dateRange.end]);

  useEffect(() => {
    // 清理已删除的选中项
    const availableIds = new Set(filteredConversations.map((c) => c.id));
    setSelectedIds((prev) => {
      const next = Array.from(prev).filter((id) => availableIds.has(id));
      return next.length === prev.size ? prev : new Set(next);
    });
  }, [filteredConversations]);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async (conversationId: string) => {
      setPreviewLoading(true);
      try {
        const messages = await getMessages(conversationId);
        if (cancelled) return;
        setPreviewMessages(messages.slice(0, 10));
      } catch (error) {
        console.error("[ChatHistoryView] 预览消息加载失败:", error);
        if (!cancelled) {
          setPreviewMessages([]);
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    if (previewConversationId) {
      void loadPreview(previewConversationId);
    } else {
      setPreviewMessages([]);
    }

    return () => {
      cancelled = true;
    };
  }, [getMessages, previewConversationId]);

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  };

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredConversations.map((c) => c.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    await onDeleteConversations(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleExportSelected = async () => {
    if (selectedIds.size === 0) return;
    await onExportConversations(Array.from(selectedIds));
  };

  const handlePreview = (conversationId: string) => {
    setPreviewConversationId(conversationId);
  };

  const handleOpenConversation = async (conversationId: string) => {
    await onSelectConversation(conversationId);
    setPreviewConversationId(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const currentPreviewConversation = useMemo(
    () =>
      previewConversationId
        ? conversations.find((c) => c.id === previewConversationId) || null
        : null,
    [conversations, previewConversationId],
  );

  return (
    <div
      className={`history-view ${previewConversationId ? "history-view--with-preview" : ""}`}
      data-preview-open={!!previewConversationId}
    >
      <HistoryToolbar
        searchQuery={searchQuery}
        dateRange={dateRange}
        selectionMode={selectionMode}
        selectedCount={selectedIds.size}
        totalCount={filteredConversations.length}
        onSearchChange={setSearchQuery}
        onDateRangeChange={(range) => setDateRange(range)}
        onBack={onBack}
        onToggleSelectionMode={handleToggleSelectionMode}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onDeleteSelected={handleDeleteSelected}
        onExportSelected={handleExportSelected}
      />

      <ConversationList
        conversations={filteredConversations}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onPreview={handlePreview}
        onOpenConversation={handleOpenConversation}
      />

      <MessagePreviewPanel
        isOpen={!!previewConversationId}
        conversation={currentPreviewConversation}
        messages={previewMessages}
        loading={previewLoading}
        onClose={() => setPreviewConversationId(null)}
        onOpenConversation={() => {
          if (previewConversationId) {
            void handleOpenConversation(previewConversationId);
          }
        }}
      />
    </div>
  );
}
