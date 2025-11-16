"use client";

import { useCallback, useMemo, useState } from "react";
import type { XMLVersion } from "@/app/lib/storage/types";

export interface VersionPair {
  versionA: XMLVersion;
  versionB: XMLVersion;
}

interface UseVersionCompareOptions {
  maxSelection?: number;
}

interface UseVersionCompareResult {
  isCompareMode: boolean;
  selectedIds: string[];
  toggleCompareMode: () => void;
  resetSelection: () => void;
  toggleSelection: (id: string) => void;
  isDialogOpen: boolean;
  openDialogWithPair: (pair: VersionPair) => void;
  closeDialog: () => void;
  activePair: VersionPair | null;
}

export function useVersionCompare(
  options: UseVersionCompareOptions = {},
): UseVersionCompareResult {
  const maxSelection = options.maxSelection ?? 2;
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activePair, setActivePair] = useState<VersionPair | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const toggleCompareMode = useCallback(() => {
    setIsCompareMode((prev) => {
      if (prev) {
        setSelectedIds([]);
      }
      return !prev;
    });
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const toggleSelection = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((value) => value !== id);
        }
        if (prev.length >= maxSelection) {
          return [...prev.slice(1), id];
        }
        return [...prev, id];
      });
    },
    [maxSelection],
  );

  const openDialogWithPair = useCallback((pair: VersionPair) => {
    setActivePair(pair);
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return useMemo(
    () => ({
      isCompareMode,
      selectedIds,
      toggleCompareMode,
      resetSelection,
      toggleSelection,
      isDialogOpen,
      openDialogWithPair,
      closeDialog,
      activePair,
    }),
    [
      activePair,
      closeDialog,
      isCompareMode,
      isDialogOpen,
      openDialogWithPair,
      resetSelection,
      selectedIds,
      toggleCompareMode,
      toggleSelection,
    ],
  );
}
