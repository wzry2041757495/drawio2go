"use client";

import {
  Button,
  Dropdown,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
} from "@heroui/react";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Selection } from "react-aria-components";
import { useAppTranslation } from "@/app/i18n/hooks";
import type { SkillSettings } from "@/app/types/chat";
import {
  getRequiredElements,
  getThemeById,
  skillElementsConfig,
} from "@/app/config/skill-elements";
import {
  hasElementsVariable,
  hasTemplateVariables,
  hasThemeVariable,
} from "@/app/lib/prompt-template";

export interface SkillButtonProps {
  skillSettings: SkillSettings;
  onSkillSettingsChange: (settings: SkillSettings) => void;
  systemPrompt: string;
  isDisabled?: boolean;
  className?: string;
}

const themeOptions = skillElementsConfig.themes;
const elementOptions = skillElementsConfig.elements;
const elementOrder = elementOptions.map((element) => element.id);

const buildOrderedElements = (ids: Set<string>): string[] => {
  return elementOrder.filter((id) => ids.has(id));
};

export default function SkillButton({
  skillSettings,
  onSkillSettingsChange,
  systemPrompt,
  isDisabled,
  className,
}: SkillButtonProps) {
  const { t } = useAppTranslation("chat");
  const [isOpen, setIsOpen] = useState(false);

  const requiredElementIds = useMemo<Set<string>>(
    () => new Set(getRequiredElements().map((element) => element.id)),
    [],
  );

  const availableElementIds = useMemo<Set<string>>(
    () => new Set(elementOptions.map((element) => element.id)),
    [],
  );

  const selectedElementIds = useMemo(() => {
    const next = new Set<string>();
    for (const id of skillSettings.selectedElements) {
      if (availableElementIds.has(id)) {
        next.add(id);
      }
    }
    for (const id of requiredElementIds) {
      next.add(id);
    }
    return next;
  }, [availableElementIds, requiredElementIds, skillSettings.selectedElements]);

  const selectedTheme = useMemo(() => {
    return (
      getThemeById(
        skillSettings.selectedTheme as Parameters<typeof getThemeById>[0],
      ) ?? themeOptions[0]
    );
  }, [skillSettings.selectedTheme]);

  const themeLabel = selectedTheme
    ? t(selectedTheme.nameKey)
    : t("skill.theme.unknown");

  const elementCount = selectedElementIds.size;
  const buttonLabel = t("skill.buttonLabel", {
    theme: themeLabel,
    count: elementCount,
  });

  const hasAnyTemplate = hasTemplateVariables(systemPrompt);
  const hasAllTemplates =
    hasThemeVariable(systemPrompt) && hasElementsVariable(systemPrompt);
  const isTemplateReady = hasAllTemplates;

  const isButtonDisabled = Boolean(isDisabled) || !isTemplateReady;
  let disabledReason: string | null = null;

  if (!isTemplateReady) {
    disabledReason = hasAnyTemplate
      ? t("skill.disabled.partialTemplate")
      : t("skill.disabled.missingTemplate");
  } else if (isDisabled) {
    disabledReason = t("skill.disabled.unavailable");
  }

  useEffect(() => {
    if (isButtonDisabled && isOpen) {
      setIsOpen(false);
    }
  }, [isButtonDisabled, isOpen]);

  const handleThemeChange = useCallback(
    (value: string) => {
      if (!value || value === skillSettings.selectedTheme) return;
      onSkillSettingsChange({
        ...skillSettings,
        selectedTheme: value,
      });
    },
    [onSkillSettingsChange, skillSettings],
  );

  const handleElementsChange = useCallback(
    (keys: Selection) => {
      if (keys === "all") {
        const allIds = new Set<string>(elementOrder);
        for (const id of requiredElementIds) {
          allIds.add(id);
        }
        onSkillSettingsChange({
          ...skillSettings,
          selectedElements: buildOrderedElements(allIds),
        });
        return;
      }

      const next = new Set<string>();
      for (const key of keys) {
        const id = String(key);
        if (availableElementIds.has(id)) {
          next.add(id);
        }
      }
      for (const id of requiredElementIds) {
        next.add(id);
      }

      onSkillSettingsChange({
        ...skillSettings,
        selectedElements: buildOrderedElements(next),
      });
    },
    [
      availableElementIds,
      onSkillSettingsChange,
      requiredElementIds,
      skillSettings,
    ],
  );

  const button = (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      aria-label={t("skill.ariaLabel")}
      isDisabled={isButtonDisabled}
      className={["chat-icon-button", "skill-button", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Sparkles size={16} aria-hidden />
      <span className="skill-button__label">{buttonLabel}</span>
    </Button>
  );

  return (
    <TooltipRoot delay={0} isDisabled={!disabledReason}>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (isButtonDisabled) {
            setIsOpen(false);
            return;
          }
          setIsOpen(open);
        }}
      >
        {isButtonDisabled ? (
          <TooltipTrigger className="inline-flex" aria-disabled="true">
            {button}
          </TooltipTrigger>
        ) : (
          button
        )}
        <Dropdown.Popover placement="top end" className="skill-popover">
          <div className="skill-section">
            <div className="skill-section__header">
              <Label className="skill-section__title">
                {t("skill.theme.label")}
              </Label>
              <p className="skill-section__hint">
                {t("skill.theme.description")}
              </p>
            </div>
            <RadioGroup
              aria-label={t("skill.theme.label")}
              value={selectedTheme?.id ?? skillSettings.selectedTheme}
              onChange={handleThemeChange}
              isDisabled={isButtonDisabled}
              className="skill-radio-group"
            >
              {themeOptions.map((theme) => (
                <Radio key={theme.id} value={theme.id}>
                  <Radio.Content>
                    <Label>{t(theme.nameKey)}</Label>
                  </Radio.Content>
                </Radio>
              ))}
            </RadioGroup>
          </div>

          <div className="skill-section">
            <div className="skill-section__header">
              <Label className="skill-section__title">
                {t("skill.elements.label")}
              </Label>
              <p className="skill-section__hint">
                {t("skill.elements.description")}
              </p>
            </div>
            <ListBox
              aria-label={t("skill.elements.label")}
              selectionMode="multiple"
              selectedKeys={selectedElementIds}
              onSelectionChange={handleElementsChange}
              disabledKeys={
                isButtonDisabled ? "all" : new Set(requiredElementIds.values())
              }
              className="skill-elements-list"
            >
              {elementOptions.map((element) => {
                const isRequired = requiredElementIds.has(element.id);
                return (
                  <ListBox.Item
                    key={element.id}
                    id={element.id}
                    textValue={t(element.nameKey)}
                    className="skill-element-item"
                  >
                    <span className="skill-element-item__label">
                      {t(element.nameKey)}
                    </span>
                    {isRequired ? (
                      <span className="skill-element-item__required">
                        {t("skill.elements.required")}
                      </span>
                    ) : null}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                );
              })}
            </ListBox>
          </div>
        </Dropdown.Popover>
      </Dropdown>
      <TooltipContent placement="top">
        <p>{disabledReason}</p>
      </TooltipContent>
    </TooltipRoot>
  );
}
