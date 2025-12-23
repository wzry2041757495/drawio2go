"use client";

import {
  TextField,
  Input,
  Label,
  ListBox,
  Chip,
  Spinner,
  type Key,
} from "@heroui/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useAppTranslation } from "@/app/i18n/hooks";
import type { ModelConfig, ProviderConfig } from "@/app/types/chat";
import ModelIcon from "@/app/components/common/ModelIcon";

export interface ModelComboBoxProps {
  providers: ProviderConfig[];
  models: ModelConfig[];
  selectedModelId: string | null;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  isOpen?: boolean;
}

interface GroupedModels {
  provider: ProviderConfig;
  models: ModelConfig[];
}

const normalize = (value: string) => value.toLowerCase().trim();

const getModelLabel = (model: ModelConfig) =>
  model.displayName || model.modelName;

export default function ModelComboBox({
  providers,
  models,
  selectedModelId,
  onSelect,
  disabled = false,
  isLoading = false,
  isOpen = false,
}: ModelComboBoxProps) {
  const [inputValue, setInputValue] = useState("");
  const { t } = useAppTranslation("chat");
  const searchRef = useRef<HTMLDivElement>(null);

  const groupedModels = useMemo<GroupedModels[]>(() => {
    if (providers.length === 0 || models.length === 0) return [];

    const modelsByProvider = models.reduce<Map<string, ModelConfig[]>>(
      (acc, model) => {
        const list = acc.get(model.providerId);
        if (list) {
          list.push(model);
        } else {
          acc.set(model.providerId, [model]);
        }
        return acc;
      },
      new Map(),
    );

    return providers.reduce<GroupedModels[]>((acc, provider) => {
      const providerModels = modelsByProvider.get(provider.id);
      if (providerModels?.length) {
        acc.push({ provider, models: providerModels });
      }
      return acc;
    }, []);
  }, [providers, models]);

  const filteredGroups = useMemo<GroupedModels[]>(() => {
    if (!inputValue.trim()) return groupedModels;

    const keyword = normalize(inputValue);

    return groupedModels
      .map((group) => {
        const providerMatched = normalize(group.provider.displayName).includes(
          keyword,
        );

        const filteredModels = providerMatched
          ? group.models
          : group.models.filter((model) =>
              normalize(getModelLabel(model)).includes(keyword),
            );

        if (providerMatched && filteredModels.length === 0) {
          return { ...group, models: group.models };
        }

        if (filteredModels.length === 0) return null;
        return { ...group, models: filteredModels };
      })
      .filter(Boolean) as GroupedModels[];
  }, [groupedModels, inputValue]);

  // Popover 打开时重置搜索框并聚焦
  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      // 延迟聚焦，确保 Popover 渲染完成
      requestAnimationFrame(() => {
        const input = searchRef.current?.querySelector("input");
        input?.focus();
      });
    }
  }, [isOpen]);

  const handleSelectionChange = useCallback(
    (keys: "all" | Set<Key>) => {
      if (keys === "all") return;
      const key = keys.values().next().value;
      if (key !== undefined && key !== "no-result") {
        onSelect(String(key));
      }
    },
    [onSelect],
  );

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setInputValue("");
      }
    },
    [],
  );

  const isDisabled =
    disabled || isLoading || providers.length === 0 || models.length === 0;

  const noResult = filteredGroups.length === 0;

  if (providers.length === 0 || models.length === 0) {
    return <p className="model-selector-empty">{t("modelSelector.empty")}</p>;
  }

  return (
    <div className="model-selector-panel">
      {/* 搜索框 */}
      <div className="model-selector-search" ref={searchRef}>
        <TextField
          aria-label={t("modelSelector.label")}
          value={inputValue}
          onChange={handleInputChange}
          isDisabled={isDisabled}
        >
          <Label className="sr-only">{t("modelSelector.label")}</Label>
          <Input
            placeholder={t("modelSelector.placeholder")}
            onKeyDown={handleInputKeyDown}
            className="model-selector-input"
          />
        </TextField>
      </div>

      {/* 模型列表 */}
      <div className="model-selector-list">
        <ListBox
          aria-label={t("modelSelector.label")}
          selectionMode="single"
          selectedKeys={
            selectedModelId ? new Set([selectedModelId]) : new Set()
          }
          onSelectionChange={handleSelectionChange}
          disabledKeys={isDisabled ? "all" : undefined}
        >
          {noResult ? (
            <ListBox.Item
              key="no-result"
              id="no-result"
              textValue={t("modelSelector.noResult")}
              isDisabled
            >
              <div className="model-selector-empty">
                {t("modelSelector.noResult")}
              </div>
            </ListBox.Item>
          ) : (
            filteredGroups.map(({ provider, models: providerModels }) => (
              <ListBox.Section key={provider.id}>
                {providerModels.map((model) => (
                  <ListBox.Item
                    key={model.id}
                    id={model.id}
                    textValue={getModelLabel(model)}
                  >
                    <div className="model-option-content">
                      <div className="model-option-header">
                        <div className="flex min-w-0 items-center gap-2">
                          <ModelIcon
                            size={18}
                            modelId={model.id}
                            modelName={getModelLabel(model)}
                            providerId={provider.id}
                            providerType={provider.providerType}
                            apiUrl={provider.apiUrl}
                            className="text-primary"
                          />
                          <span className="model-name truncate">
                            {getModelLabel(model)}
                          </span>
                          {model.isDefault && (
                            <Chip size="sm" variant="secondary">
                              {t("modelSelector.defaultLabel")}
                            </Chip>
                          )}
                        </div>
                      </div>
                      <div className="model-option-meta">
                        <div className="model-provider-badge">
                          <ModelIcon
                            size={12}
                            providerId={provider.id}
                            providerType={provider.providerType}
                            apiUrl={provider.apiUrl}
                          />
                          <span>{provider.displayName}</span>
                        </div>
                        <span className="model-params">
                          {t("modelSelector.temperature")}: {model.temperature}{" "}
                          | {t("modelSelector.maxToolRounds")}:{" "}
                          {model.maxToolRounds}
                        </span>
                      </div>
                    </div>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            ))
          )}
        </ListBox>
      </div>

      {isLoading && (
        <div className="model-selector-loading" aria-hidden>
          <Spinner size="sm" />
        </div>
      )}
    </div>
  );
}
