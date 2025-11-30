"use client";

import { Button } from "@heroui/react";
import {
  ArrowLeft,
  CalendarRange,
  CheckSquare2,
  ListChecks,
  Search,
  Square,
  Trash2,
  Download,
} from "lucide-react";
import { useAppTranslation } from "@/app/i18n/hooks";

interface HistoryToolbarProps {
  searchQuery: string;
  dateRange: { start: string; end: string };
  selectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onBack: () => void;
  onToggleSelectionMode: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
}

export default function HistoryToolbar({
  searchQuery,
  dateRange,
  selectionMode,
  selectedCount,
  totalCount,
  onSearchChange,
  onDateRangeChange,
  onBack,
  onToggleSelectionMode,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
}: HistoryToolbarProps) {
  const { t } = useAppTranslation("chat");

  return (
    <div className="history-toolbar">
      <Button
        variant="tertiary"
        size="sm"
        onPress={onBack}
        aria-label={t("sidebar.back")}
      >
        <ArrowLeft size={16} />
        {t("sidebar.back")}
      </Button>

      <div className="history-toolbar__search">
        <Search size={16} aria-hidden />
        <input
          className="history-toolbar__search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("history.search.placeholder")}
          aria-label={t("aria.search")}
        />
      </div>

      <div className="history-toolbar__filters">
        <div className="history-toolbar__date">
          <CalendarRange size={16} aria-hidden />
          <input
            aria-label={t("history.range.from")}
            className="history-toolbar__date-input"
            type="date"
            value={dateRange.start}
            onChange={(event) =>
              onDateRangeChange({ ...dateRange, start: event.target.value })
            }
          />
          <span className="history-toolbar__date-sep">—</span>
          <input
            aria-label={t("history.range.to")}
            className="history-toolbar__date-input"
            type="date"
            value={dateRange.end}
            onChange={(event) =>
              onDateRangeChange({ ...dateRange, end: event.target.value })
            }
          />
        </div>

        <Button
          size="sm"
          variant={selectionMode ? "primary" : "secondary"}
          onPress={onToggleSelectionMode}
        >
          <ListChecks size={16} />
          {selectionMode
            ? t("history.selectionModeExit")
            : t("history.selectionMode")}
        </Button>
      </div>

      {selectionMode && (
        <div className="history-toolbar__bulk">
          <Button size="sm" variant="secondary" onPress={onSelectAll}>
            <CheckSquare2 size={16} />
            {t("conversations.actions.selectAll")}
          </Button>
          <Button size="sm" variant="tertiary" onPress={onClearSelection}>
            <Square size={16} />
            {t("conversations.actions.clearSelection")}
          </Button>
          <span className="history-toolbar__count">
            {t("history.selectionCount", {
              selected: selectedCount,
              total: totalCount,
            })}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onPress={onExportSelected}
            isDisabled={selectedCount === 0}
          >
            <Download size={16} />
            {t("conversations.actions.export")}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onPress={onDeleteSelected}
            isDisabled={selectedCount === 0}
          >
            <Trash2 size={16} />
            {t("conversations.actions.delete")}
          </Button>
        </div>
      )}
    </div>
  );
}
