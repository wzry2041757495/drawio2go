import { SkillSettings } from "@/app/types/chat";
import {
  getElementById,
  getRequiredElements,
  getThemeById,
} from "@/app/config/skill-elements";

/**
 * Check if system prompt contains template variables.
 */
export function hasTemplateVariables(prompt: string): boolean {
  return /\{\{theme\}\}/.test(prompt) || /\{\{elements\}\}/.test(prompt);
}

/**
 * Check if the theme variable exists.
 */
export function hasThemeVariable(prompt: string): boolean {
  return /\{\{theme\}\}/.test(prompt);
}

/**
 * Check if the elements variable exists.
 */
export function hasElementsVariable(prompt: string): boolean {
  return /\{\{elements\}\}/.test(prompt);
}

/**
 * Build theme prompt fragment from skill settings.
 */
export function buildThemePrompt(skillSettings: SkillSettings): string {
  const theme = getThemeById(
    skillSettings.selectedTheme as Parameters<typeof getThemeById>[0],
  );
  if (!theme || theme.id === "custom") {
    return "";
  }
  return theme.promptFragment;
}

/**
 * Build elements prompt fragments from skill settings.
 */
export function buildElementsPrompt(skillSettings: SkillSettings): string {
  const requiredIds = getRequiredElements().map((element) => element.id);
  const allSelectedIds = [
    ...new Set([...requiredIds, ...skillSettings.selectedElements]),
  ];

  const fragments = allSelectedIds
    .map((id) => getElementById(id as Parameters<typeof getElementById>[0]))
    .filter(Boolean)
    .map((element) => element!.promptFragment);

  return fragments.join("\n\n");
}

/**
 * Apply template variable replacements.
 */
export function applyTemplateVariables(
  prompt: string,
  skillSettings: SkillSettings,
): string {
  let result = prompt;

  if (hasThemeVariable(result)) {
    result = result.replace(/\{\{theme\}\}/g, buildThemePrompt(skillSettings));
  }

  if (hasElementsVariable(result)) {
    result = result.replace(
      /\{\{elements\}\}/g,
      buildElementsPrompt(skillSettings),
    );
  }

  return result;
}
