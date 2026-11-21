import { DEFAULT_HOSTS, HostPhotoRequest, HostRecord } from "./types";

const HOSTS_STORAGE_KEY = "redbox_hosts_v1";
const REQUESTS_STORAGE_KEY = "redbox_photo_requests_v1";

export function isMissingTableError(error: { code?: string; message?: string; status?: number } | null): boolean {
  if (!error) return false;
  const code = error.code || "";
  const msg = (error.message || "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("could not find the table") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export function getLocalHosts(): HostRecord[] {
  if (typeof window === "undefined") {
    return DEFAULT_HOSTS.map((name, idx) => ({ id: `local-${idx}`, name, avatar_url: null }));
  }
  try {
    const raw = window.localStorage.getItem(HOSTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as HostRecord[];
    }
  } catch {}
  const initial: HostRecord[] = DEFAULT_HOSTS.map((name, idx) => ({
    id: `local-${idx + 1}`,
    name,
    avatar_url: null,
    created_at: new Date(2026, 0, idx + 1).toISOString(),
  }));
  saveLocalHosts(initial);
  return initial;
}

export function saveLocalHosts(hosts: HostRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOSTS_STORAGE_KEY, JSON.stringify(hosts));
  } catch {}
}

export function getLocalPhotoRequests(): HostPhotoRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as HostPhotoRequest[];
    }
  } catch {}
  return [];
}

export function saveLocalPhotoRequests(reqs: HostPhotoRequest[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(reqs));
  } catch {}
}

/**
 * Resize and crop uploaded image file to a compact 240x240 JPEG data URL
 * so avatars remain crisp and lightweight in both Supabase text columns and localStorage.
 */
export async function compressAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar (JPG, PNG, atau WebP).");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran file maksimal 5 MB.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Format gambar tidak dapat dimuat."));
    el.src = dataUrl;
  });

  const size = 240;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  const minSide = Math.min(img.width, img.height);
  const sx = (img.width - minSide) / 2;
  const sy = (img.height - minSide) / 2;

  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.86);
}
