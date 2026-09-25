/**
 * Saving files out of the app.
 *
 * On the web this is a plain download. On Android the WebView can hand the file
 * to the system share sheet (which is how a payload lands in Google Drive or
 * Dropbox), and if that is unavailable the text is copied to the clipboard so
 * the user can paste it somewhere safe.
 */

function triggerDownload(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}

export type SaveOutcome = "downloaded" | "shared" | "clipboard" | "failed";

export async function saveTextFile(text: string, filename: string, mime = "application/json"): Promise<SaveOutcome> {
  const blob = new Blob([text], { type: mime });

  // Android / iOS share sheet first — it is the only route that can put the
  // file straight into a cloud folder the user owns.
  try {
    const file = new File([blob], filename, { type: mime });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: filename });
      return "shared";
    }
  } catch {
    /* share cancelled or unsupported — fall through to a download */
  }

  if (triggerDownload(blob, filename)) return "downloaded";

  try {
    await navigator.clipboard.writeText(text);
    return "clipboard";
  } catch {
    return "failed";
  }
}

export async function exportJsonFile(json: string, filename: string): Promise<SaveOutcome> {
  return saveTextFile(json, filename, "application/json");
}
