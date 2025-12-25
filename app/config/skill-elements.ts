import rawConfig from "./skill-elements.json";

export type SkillThemeId = "modern" | "academic" | "classic" | "custom";
export type SkillElementId =
  | "general"
  | "basic"
  | "misc"
  | "uml"
  | "aws"
  | "azure"
  | "gcp"
  | "network";

export type SkillThemeConfig = {
  id: SkillThemeId;
  nameKey: string;
  promptFragment: string;
};

export type SkillElementConfig = {
  id: SkillElementId;
  nameKey: string;
  required?: boolean;
  promptFragment: string;
};

export type SkillElementsConfig = {
  themes: SkillThemeConfig[];
  elements: SkillElementConfig[];
};

export const skillElementsConfig = rawConfig as SkillElementsConfig;

export function loadSkillElementsConfig(): SkillElementsConfig {
  return skillElementsConfig;
}

export function getThemeById(
  id: SkillThemeId,
  config: SkillElementsConfig = skillElementsConfig,
): SkillThemeConfig | undefined {
  return config.themes.find((theme) => theme.id === id);
}

export function getElementById(
  id: SkillElementId,
  config: SkillElementsConfig = skillElementsConfig,
): SkillElementConfig | undefined {
  return config.elements.find((element) => element.id === id);
}

export function getRequiredElements(
  config: SkillElementsConfig = skillElementsConfig,
): SkillElementConfig[] {
  return config.elements.filter((element) => element.required);
}

export function getOptionalElements(
  config: SkillElementsConfig = skillElementsConfig,
): SkillElementConfig[] {
  return config.elements.filter((element) => !element.required);
}
