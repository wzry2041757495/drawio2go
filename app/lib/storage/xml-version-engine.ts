import { diff_match_patch } from "diff-match-patch";
import { ErrorCodes } from "@/app/errors/error-codes";
import i18n from "@/app/i18n/client";

import {
  ZERO_SOURCE_VERSION_ID,
  DIFF_KEYFRAME_THRESHOLD,
  MAX_DIFF_CHAIN_LENGTH,
  WIP_VERSION,
} from "./constants";
import type { XMLVersion } from "./types";
import { normalizeDiagramXml } from "../drawio-xml-utils";
import { createLogger } from "@/app/lib/logger";

const logger = createLogger("XMLVersion");

type DiffEngine = InstanceType<typeof diff_match_patch>;

export type VersionResolver = (id: string) => Promise<XMLVersion | null>;

export interface VersionPayloadResult {
  xml_content: string;
  is_keyframe: boolean;
  diff_chain_depth: number;
  source_version_id: string;
}

const buildKeyframePayload = (xml: string): VersionPayloadResult => ({
  xml_content: xml,
  is_keyframe: true,
  diff_chain_depth: 0,
  source_version_id: ZERO_SOURCE_VERSION_ID,
});

const createDiffEngine = (): DiffEngine => {
  const engine = new diff_match_patch();
  engine.Diff_Timeout = 1;
  return engine;
};

/**
 * 计算新版本的持久化策略（关键帧 vs Diff）
 * 如果与基线版本内容一致，则返回 null 表示无需创建新版本
 * WIP 版本始终返回关键帧 payload，即使内容相同
 */
export async function computeVersionPayload({
  newXml,
  semanticVersion,
  baseVersion,
  resolveVersionById,
}: {
  newXml: string;
  semanticVersion: string;
  baseVersion: XMLVersion | null;
  resolveVersionById: VersionResolver;
}): Promise<VersionPayloadResult | null> {
  const fallbackPayload = buildKeyframePayload(newXml);

  // WIP 版本始终为关键帧（全量存储），允许相同内容更新
  if (semanticVersion === WIP_VERSION) {
    return fallbackPayload;
  }

  // WIP 版本是独立草稿，不应作为其他版本的 diff 链基础
  const effectiveBaseVersion =
    baseVersion?.semantic_version === WIP_VERSION ? null : baseVersion;

  // 历史版本：使用关键帧 + Diff 混合策略
  if (!effectiveBaseVersion) {
    return fallbackPayload;
  }

  let baseXml: string;
  try {
    baseXml = await materializeVersionXml(
      effectiveBaseVersion,
      resolveVersionById,
    );
  } catch (error) {
    logger.warn("基线版本恢复失败，降级为关键帧", {
      error,
      semanticVersion,
      baseVersionId: effectiveBaseVersion.id,
      projectUuid: effectiveBaseVersion.project_uuid,
    });
    return fallbackPayload;
  }
  if (baseXml === newXml) {
    return null;
  }

  const diffEngine = createDiffEngine();
  let diffs;
  try {
    diffs = diffEngine.diff_main(baseXml, newXml);
    diffEngine.diff_cleanupSemantic(diffs);
  } catch (error) {
    logger.warn("Diff 计算失败，降级为全量存储", {
      error,
      semanticVersion,
      baseVersionId: effectiveBaseVersion.id,
    });
    return fallbackPayload;
  }

  const changedCharacters = diffs.reduce((count, diff) => {
    const [operation, text] = diff;
    return operation === 0 ? count : count + text.length;
  }, 0);
  const baseline = Math.max(baseXml.length, 1);
  const changeRatio = changedCharacters / baseline;

  const nextDepth = effectiveBaseVersion.is_keyframe
    ? 1
    : effectiveBaseVersion.diff_chain_depth + 1;

  const needsKeyframe =
    changeRatio > DIFF_KEYFRAME_THRESHOLD || nextDepth > MAX_DIFF_CHAIN_LENGTH;

  if (needsKeyframe) {
    return {
      xml_content: newXml,
      is_keyframe: true,
      diff_chain_depth: 0,
      source_version_id: ZERO_SOURCE_VERSION_ID,
    };
  }

  let patchText: string;
  try {
    const patches = diffEngine.patch_make(baseXml, newXml);
    patchText = diffEngine.patch_toText(patches);
  } catch (error) {
    logger.warn("Diff 生成或序列化失败，降级为全量存储", {
      error,
      semanticVersion,
      baseVersionId: effectiveBaseVersion.id,
    });
    return fallbackPayload;
  }

  return {
    xml_content: patchText,
    is_keyframe: false,
    diff_chain_depth: nextDepth,
    source_version_id: effectiveBaseVersion.id,
  };
}

/**
 * 将任意版本恢复为完整 XML
 */
export async function materializeVersionXml(
  version: XMLVersion,
  resolveVersionById: VersionResolver,
  cache: Map<string, string> = new Map(),
): Promise<string> {
  const diffEngine = createDiffEngine();
  return resolveMaterializedXml(version, resolveVersionById, cache, diffEngine);
}

async function resolveMaterializedXml(
  version: XMLVersion,
  resolveVersionById: VersionResolver,
  cache: Map<string, string>,
  diffEngine: DiffEngine,
): Promise<string> {
  const cached = cache.get(version.id);
  if (cached) {
    return cached;
  }

  if (version.is_keyframe) {
    const normalized = normalizeDiagramXml(version.xml_content);
    cache.set(version.id, normalized);
    return normalized;
  }

  if (version.source_version_id === ZERO_SOURCE_VERSION_ID) {
    throw new Error(
      `[${ErrorCodes.VERSION_DIFF_INTEGRITY_ERROR}] ${i18n.t(
        "errors:version.diffIntegrityError",
        {
          version: version.id,
        },
      )}`,
    );
  }

  const parent = await resolveVersionById(version.source_version_id);
  if (!parent) {
    throw new Error(
      `[${ErrorCodes.VERSION_SOURCE_LOAD_FAILED}] ${i18n.t(
        "errors:version.sourceLoadFailed",
        {
          sourceVersion: version.source_version_id,
          currentVersion: version.id,
        },
      )}`,
    );
  }

  if (parent.project_uuid !== version.project_uuid) {
    const message = `[${ErrorCodes.VERSION_CROSS_PROJECT_ERROR}] ${i18n.t(
      "errors:version.crossProjectError",
      {
        parentId: parent.id,
        parentProject: parent.project_uuid,
        versionId: version.id,
        versionProject: version.project_uuid,
      },
    )}`;
    logger.error("拒绝跨项目版本链", {
      currentVersionId: version.id,
      currentProject: version.project_uuid,
      parentVersionId: parent.id,
      parentProject: parent.project_uuid,
    });
    throw new Error(message);
  }

  const baseXml = await resolveMaterializedXml(
    parent,
    resolveVersionById,
    cache,
    diffEngine,
  );

  const patches = diffEngine.patch_fromText(version.xml_content);
  const [result, applied] = diffEngine.patch_apply(patches, baseXml);
  if (applied.some((flag: boolean) => !flag)) {
    logger.error("Diff 应用失败，终止恢复", {
      versionId: version.id,
      sourceVersionId: version.source_version_id,
    });
    throw new Error(
      `[${ErrorCodes.VERSION_DIFF_INTEGRITY_ERROR}] ${i18n.t(
        "errors:version.diffIntegrityError",
        {
          version: version.id,
        },
      )}`,
    );
  }

  const normalized = normalizeDiagramXml(result);
  cache.set(version.id, normalized);
  return normalized;
}
