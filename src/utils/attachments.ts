// Uploaded files live only in this page's JavaScript runtime.
const files = new Map<string, Blob>();

export async function saveAttachment(blob: Blob): Promise<string> {
  const id = `attachment_${crypto.randomUUID()}`;
  files.set(id, blob);
  return id;
}

export async function readAttachment(id: string): Promise<Blob | undefined> {
  return files.get(id);
}

export function clearAttachments(): void { files.clear(); }

export function downloadAttachment(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name.replace(/[\\/:*?"<>|]/g, '_');
  document.body.append(anchor);
  try { anchor.click(); } finally {
    anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
