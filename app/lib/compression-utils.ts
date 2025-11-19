const DEFLATE_RAW = "deflate-raw";

export async function compressBlob(blob: Blob): Promise<Blob> {
  const compressedStream = blob
    .stream()
    .pipeThrough(new CompressionStream(DEFLATE_RAW));
  return new Response(compressedStream).blob();
}

export async function decompressBlob(blob: Blob): Promise<Blob> {
  const decompressedStream = blob
    .stream()
    .pipeThrough(new DecompressionStream(DEFLATE_RAW));
  return new Response(decompressedStream).blob();
}
