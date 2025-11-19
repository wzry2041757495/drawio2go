"use client";

interface SvgMetrics {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

interface NormalizedTransform {
  transform: string;
  normalizedHeight: number;
}

export interface SmartDiffStats {
  matched: number;
  changed: number;
  onlyA: number;
  onlyB: number;
  coverage: number;
}

export interface SmartDiffResult {
  svg: string | null;
  stats: SmartDiffStats;
  warnings: string[];
}

const DEFAULT_STATS: SmartDiffStats = {
  matched: 0,
  changed: 0,
  onlyA: 0,
  onlyB: 0,
  coverage: 0,
};

const NORMALIZED_WIDTH = 1200;
const MIN_NORMALIZED_HEIGHT = 640;

let cachedParser: DOMParser | null = null;
let cachedSerializer: XMLSerializer | null = null;

function ensureDomParser(): DOMParser | null {
  if (cachedParser) return cachedParser;
  if (
    typeof window === "undefined" ||
    typeof window.DOMParser === "undefined"
  ) {
    return null;
  }
  cachedParser = new window.DOMParser();
  return cachedParser;
}

function ensureSerializer(): XMLSerializer | null {
  if (cachedSerializer) return cachedSerializer;
  if (typeof XMLSerializer === "undefined") return null;
  cachedSerializer = new XMLSerializer();
  return cachedSerializer;
}

function parseSvgRoot(
  source: string | undefined,
  label: string,
  warnings: string[],
): SVGSVGElement | null {
  if (!source) return null;
  const parser = ensureDomParser();
  if (!parser) {
    warnings.push("当前环境不支持 DOMParser，无法解析 SVG");
    return null;
  }
  try {
    const doc = parser.parseFromString(source, "image/svg+xml");
    if (doc.querySelector("parsererror")) {
      warnings.push(`${label} 的 SVG 无法解析`);
      return null;
    }
    const root = doc.querySelector("svg");
    if (!root) {
      warnings.push(`${label} 缺少 <svg> 根节点`);
      return null;
    }
    return root as SVGSVGElement;
  } catch (error) {
    console.warn("parseSvgRoot error", error);
    warnings.push(`${label} 的 SVG 解析失败`);
    return null;
  }
}

function parseLength(value: string | null): number | null {
  if (!value) return null;
  const matched = value.match(/-?\d+(?:\.\d+)?/);
  if (!matched) return null;
  const parsed = Number.parseFloat(matched[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractMetrics(svg: SVGSVGElement | null): SvgMetrics | null {
  if (!svg) return null;
  let minX = 0;
  let minY = 0;
  let width = 0;
  let height = 0;
  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox
      .replace(/,/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => Number.parseFloat(part));
    if (parts.length === 4 && parts.every((part) => Number.isFinite(part))) {
      [minX, minY, width, height] = parts;
    }
  }

  if (width <= 0 || height <= 0) {
    const widthAttr = parseLength(svg.getAttribute("width"));
    const heightAttr = parseLength(svg.getAttribute("height"));
    width = width > 0 ? width : (widthAttr ?? 100);
    height = height > 0 ? height : (heightAttr ?? 100);
  }

  return {
    minX,
    minY,
    width: width > 0 ? width : 100,
    height: height > 0 ? height : 100,
  };
}

function collectLeafCells(svg: SVGSVGElement | null): Map<string, Element> {
  const map = new Map<string, Element>();
  if (!svg) return map;
  const nodes = svg.querySelectorAll<HTMLElement>("[data-cell-id]");
  nodes.forEach((node) => {
    const cellId = node.getAttribute("data-cell-id");
    if (!cellId) return;
    if (node.querySelector("[data-cell-id]")) {
      return;
    }
    map.set(cellId, node.cloneNode(true) as Element);
  });
  return map;
}

function normalizedHeight(metrics: SvgMetrics | null): number {
  if (!metrics) return 0;
  const width = metrics.width || 1;
  const scale = NORMALIZED_WIDTH / (width || 1);
  return metrics.height * scale;
}

function computeArea(metrics: SvgMetrics | null): number {
  if (!metrics) return -1;
  return (metrics.width || 0) * (metrics.height || 0);
}

function pickBaseVersion(
  metricsA: SvgMetrics | null,
  metricsB: SvgMetrics | null,
  cellsA: number,
  cellsB: number,
): "A" | "B" {
  // 1) 优先使用画布面积更大的版本作为底层
  const areaA = computeArea(metricsA);
  const areaB = computeArea(metricsB);
  if (areaA !== areaB) {
    return areaA > areaB ? "A" : "B";
  }

  // 2) 面积相同则选择元素数量更多的版本
  if (cellsA !== cellsB) {
    return cellsA > cellsB ? "A" : "B";
  }

  // 3) 完全持平时默认以版本 B（通常为更新版本）作为基准
  return "B";
}

function buildTransform(
  metrics: SvgMetrics | null,
  finalHeight: number,
): NormalizedTransform {
  if (!metrics) {
    return {
      transform: "",
      normalizedHeight: finalHeight,
    };
  }
  const width = metrics.width || 1;
  const scale = NORMALIZED_WIDTH / width;
  const height = metrics.height * scale;
  const offsetY = (finalHeight - height) / 2;
  const safeOffsetY = Number.isFinite(offsetY) ? offsetY : 0;
  return {
    normalizedHeight: height,
    transform: `translate(0 ${safeOffsetY.toFixed(3)}) scale(${scale.toFixed(6)}) translate(${(-metrics.minX).toFixed(3)} ${(-metrics.minY).toFixed(3)})`,
  };
}

function normalizeMarkup(markup: string) {
  return markup.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
}

function wrapCells(cells: string[], transform: string, extraClass: string) {
  if (!cells.length) return "";
  const transformAttr = transform ? ` transform="${transform}"` : "";
  return `<g class="smart-diff__layer ${extraClass}"${transformAttr}>${cells.join(
    "",
  )}</g>`;
}

interface MatchEntry {
  id: string;
  markupA: string;
  markupB: string;
}

export function generateSmartDiffSvg(
  leftSvg?: string,
  rightSvg?: string,
): SmartDiffResult {
  const warnings: string[] = [];
  const serializer = ensureSerializer();

  if (!serializer) {
    warnings.push("当前环境缺少 XMLSerializer，无法生成智能差异 SVG");
    return {
      svg: null,
      warnings,
      stats: { ...DEFAULT_STATS },
    };
  }

  const leftRoot = parseSvgRoot(leftSvg, "版本 A", warnings);
  const rightRoot = parseSvgRoot(rightSvg, "版本 B", warnings);

  if (!leftRoot && !rightRoot) {
    warnings.push("两个版本都缺少可比对的 SVG 数据");
    return {
      svg: null,
      warnings,
      stats: { ...DEFAULT_STATS },
    };
  }

  const leftCells = collectLeafCells(leftRoot);
  const rightCells = collectLeafCells(rightRoot);

  if (!leftCells.size) {
    warnings.push("版本 A 未检测到可识别的 data-cell-id 元素");
  }
  if (!rightCells.size) {
    warnings.push("版本 B 未检测到可识别的 data-cell-id 元素");
  }

  const stats: SmartDiffStats = { ...DEFAULT_STATS };
  const matchEntries: MatchEntry[] = [];
  const sourceAEntries: string[] = [];
  const sourceBEntries: string[] = [];

  const ids = new Set<string>([
    ...Array.from(leftCells.keys()),
    ...Array.from(rightCells.keys()),
  ]);

  ids.forEach((id) => {
    const nodeA = leftCells.get(id);
    const nodeB = rightCells.get(id);
    if (nodeA && nodeB) {
      const markupA = serializer.serializeToString(nodeA);
      const markupB = serializer.serializeToString(nodeB);
      const isIdentical = normalizeMarkup(markupA) === normalizeMarkup(markupB);
      if (isIdentical) {
        stats.matched += 1;
        matchEntries.push({
          id,
          markupA,
          markupB,
        });
        return;
      }

      stats.changed += 1;
      sourceAEntries.push(
        `<g class="smart-diff__cell smart-diff__cell--changed-a" data-cell-id="${id}">${markupA}</g>`,
      );
      sourceBEntries.push(
        `<g class="smart-diff__cell smart-diff__cell--changed-b" data-cell-id="${id}">${markupB}</g>`,
      );
      return;
    }

    if (nodeA) {
      stats.onlyA += 1;
      const markup = serializer.serializeToString(nodeA);
      sourceAEntries.push(
        `<g class="smart-diff__cell smart-diff__cell--removed" data-cell-id="${id}">${markup}</g>`,
      );
      return;
    }

    if (nodeB) {
      stats.onlyB += 1;
      const markup = serializer.serializeToString(nodeB);
      sourceBEntries.push(
        `<g class="smart-diff__cell smart-diff__cell--added" data-cell-id="${id}">${markup}</g>`,
      );
    }
  });

  const total = stats.matched + stats.changed + stats.onlyA + stats.onlyB;
  stats.coverage = total > 0 ? Number((stats.matched / total).toFixed(4)) : 0;

  if (!total) {
    warnings.push("未找到可用于智能匹配的元素");
    return {
      svg: null,
      warnings,
      stats,
    };
  }

  const metricsA = extractMetrics(leftRoot);
  const metricsB = extractMetrics(rightRoot);
  const heightCandidates = [
    normalizedHeight(metricsA),
    normalizedHeight(metricsB),
  ].filter((value) => Number.isFinite(value) && value > 0) as number[];
  const finalHeight = Math.max(
    MIN_NORMALIZED_HEIGHT,
    heightCandidates.length
      ? Math.max(...heightCandidates)
      : MIN_NORMALIZED_HEIGHT,
  );

  const transformA = buildTransform(metricsA, finalHeight);
  const transformB = buildTransform(metricsB, finalHeight);
  const baseSide = pickBaseVersion(
    metricsA,
    metricsB,
    leftCells.size,
    rightCells.size,
  );
  const baseTransform = baseSide === "A" ? transformA : transformB;

  const svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NORMALIZED_WIDTH} ${finalHeight.toFixed(2)}" class="smart-diff__svg" role="img" aria-label="智能差异高亮">`,
    `<style>
      :root {
        --smart-diff-bg: var(--bg-secondary, #0f172a);
        --smart-diff-base: color-mix(in oklch, var(--foreground, #0f172a) 18%, transparent);
        --smart-diff-added: color-mix(in oklch, var(--success, #16a34a) 85%, transparent);
        --smart-diff-removed: color-mix(in oklch, var(--danger, #ef4444) 85%, transparent);
        --smart-diff-changed: color-mix(in oklch, var(--warning, #f59e0b) 85%, transparent);
      }
      .smart-diff__bg {
        fill: var(--smart-diff-bg);
      }
      .smart-diff__layer {
        isolation: isolate;
      }
      .smart-diff__cell {
        opacity: 0.92;
        transition: opacity 200ms ease;
      }
      .smart-diff__cell--match {
        opacity: 0.32;
        mix-blend-mode: multiply;
        filter: saturate(0.2);
      }
      .smart-diff__cell--removed,
      .smart-diff__cell--changed-a {
        mix-blend-mode: screen;
        filter: drop-shadow(0 0 14px color-mix(in srgb, var(--smart-diff-removed) 60%, transparent));
      }
      .smart-diff__cell--added,
      .smart-diff__cell--changed-b {
        mix-blend-mode: screen;
        filter: drop-shadow(0 0 14px color-mix(in srgb, var(--smart-diff-added) 60%, transparent));
      }
      .smart-diff__cell--changed-a {
        opacity: 0.85;
      }
      .smart-diff__cell--changed-b {
        opacity: 0.85;
      }
    </style>`,
    `<rect class="smart-diff__bg" width="100%" height="100%" rx="32" />`,
  ];

  const neutralEntries = matchEntries.map((entry) => {
    const markup = baseSide === "A" ? entry.markupA : entry.markupB;
    return `<g class="smart-diff__cell smart-diff__cell--match" data-cell-id="${entry.id}">${markup}</g>`;
  });
  svgParts.push(
    wrapCells(
      neutralEntries,
      baseTransform.transform,
      "smart-diff__layer--base",
    ),
  );
  svgParts.push(
    wrapCells(
      sourceAEntries,
      transformA.transform,
      "smart-diff__layer--removed",
    ),
  );
  svgParts.push(
    wrapCells(sourceBEntries, transformB.transform, "smart-diff__layer--added"),
  );
  svgParts.push("</svg>");

  return {
    svg: svgParts.join(""),
    stats,
    warnings,
  };
}
