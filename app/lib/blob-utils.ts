/**
 * 通用二进制工具：在 Browser/Electron/Node 环境下安全地将多种输入类型转换为 Blob。
 * 解决 pages_svg / preview_svg 等字段在不同运行时的类型差异（Blob、ArrayBuffer、Buffer、typed array、纯对象或字符串）。
 */
export type BinarySource =
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | { data?: number[]; buffer?: ArrayBufferLike | ArrayBufferView }
  | { buffer?: ArrayBufferLike }
  | { data?: number[] }
  | string
  | null
  | undefined;

function cloneArrayBufferLike(
  source: ArrayBufferLike,
  byteOffset = 0,
  length?: number,
): ArrayBuffer {
  const view = new Uint8Array(source, byteOffset, length ?? undefined);
  const clone = new Uint8Array(view.byteLength);
  clone.set(view);
  return clone.buffer;
}

/**
 * 将任意常见的二进制来源转换为 Blob，保持数据拷贝以避免共享内存带来的副作用。
 *
 * @param source - 多种可能的二进制来源
 * @param mimeType - 目标 MIME 类型
 * @returns Blob 实例；无法转换时返回 null
 */
export function createBlobFromSource(
  source: BinarySource,
  mimeType: string,
): Blob | null {
  if (!source) return null;
  if (source instanceof Blob)
    return source.type ? source : new Blob([source], { type: mimeType });

  if (typeof source === "string") {
    return new Blob([source], { type: mimeType });
  }

  if (source instanceof ArrayBuffer) {
    return new Blob([source.slice(0)], { type: mimeType });
  }

  if (ArrayBuffer.isView(source)) {
    const view = source as ArrayBufferView;
    const cloned = cloneArrayBufferLike(
      view.buffer as ArrayBufferLike,
      view.byteOffset,
      view.byteLength,
    );
    return new Blob([cloned], { type: mimeType });
  }

  if (
    typeof source === "object" &&
    source !== null &&
    "buffer" in source &&
    source.buffer
  ) {
    const bufferSource = source.buffer;
    if (bufferSource instanceof ArrayBuffer) {
      return new Blob([bufferSource.slice(0)], { type: mimeType });
    }
    if (ArrayBuffer.isView(bufferSource)) {
      const view = bufferSource as ArrayBufferView;
      const cloned = cloneArrayBufferLike(
        view.buffer as ArrayBufferLike,
        view.byteOffset,
        view.byteLength,
      );
      return new Blob([cloned], { type: mimeType });
    }
    const cloned = cloneArrayBufferLike(bufferSource as ArrayBufferLike);
    return new Blob([cloned], { type: mimeType });
  }

  if (
    typeof source === "object" &&
    source !== null &&
    "data" in source &&
    Array.isArray(source.data)
  ) {
    const cloned = Uint8Array.from(source.data ?? []);
    return new Blob([cloned.buffer], { type: mimeType });
  }

  return null;
}
