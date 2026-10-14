/** Guess a MIME type from a file URI's extension. */
export function guessMimeType(uri: string, fallback: string): string {
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  return fallback;
}

/** Derive a file name from a URI, falling back to a timestamped name. */
export function fileNameFor(uri: string): string {
  const last = uri.split("/").pop();
  return last && last.length > 0 ? last : `upload-${Date.now()}`;
}
