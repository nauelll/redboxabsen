"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Music2, Trash2, Upload, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type MusicTrack = { id: string; path: string; url: string; title: string };
type MusicSettings = {
  id: number;
  enabled: boolean;
  track_url: string;
  title: string;
  volume: number;
  tracks: MusicTrack[];
};

const BUCKET = "site-music";
const DEFAULTS: MusicSettings = {
  id: 1,
  enabled: false,
  track_url: "",
  title: "REDBOX Background Music",
  volume: 35,
  tracks: [],
};
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function AdminMusicSettings() {
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<MusicSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("site_music")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setForm({
          ...DEFAULTS,
          ...data,
          tracks: Array.isArray(data.tracks) ? data.tracks : [],
        });
      }
      if (error) {
        setNotice(
          error.message.toLowerCase().includes("does not exist")
            ? "Fitur musik belum disiapkan di Supabase. Jalankan file supabase/migrations/20261121_site_music_playlist.sql terlebih dahulu."
            : error.message
        );
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function persist(next: MusicSettings, successMessage: string) {
    setSaving(true);
    setNotice("");
    const { error } = await supabase.from("site_music").upsert(
      {
        id: 1,
        enabled: next.enabled,
        track_url: next.track_url,
        title: next.title,
        volume: Math.min(100, Math.max(0, Number(next.volume) || 0)),
        tracks: next.tracks,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    setSaving(false);
    if (error) {
      setNotice(error.message);
      return false;
    }
    setForm(next);
    setNotice(successMessage);
    return true;
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    const url = form.track_url.trim();
    if (url && !isHttpUrl(url)) {
      setNotice("URL musik harus berupa alamat http:// atau https:// yang valid.");
      return;
    }
    await persist(
      { ...form, track_url: url, title: form.title.trim() || "REDBOX Background Music" },
      "Pengaturan musik berhasil disimpan untuk seluruh pengunjung."
    );
  }

  async function uploadTracks(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    for (const file of files) {
      if (!file.type.startsWith("audio/")) {
        setNotice(`File ${file.name} bukan file audio.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setNotice(`Ukuran ${file.name} melebihi batas 20 MB.`);
        return;
      }
    }

    setUploading(true);
    setNotice("");
    const uploaded: MusicTrack[] = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${safeName}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "audio/mpeg",
        upsert: false,
      });
      if (error) {
        if (uploaded.length) {
          await supabase.storage.from(BUCKET).remove(uploaded.map((track) => track.path));
        }
        setUploading(false);
        setNotice(error.message);
        return;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      uploaded.push({
        id: path,
        path,
        url: data.publicUrl,
        title: file.name.replace(/\.[^.]+$/, ""),
      });
    }

    const tracks = [...form.tracks, ...uploaded];
    const firstTrack = form.track_url ? null : uploaded[0];
    const next = {
      ...form,
      tracks,
      track_url: firstTrack?.url || form.track_url,
      title: firstTrack?.title || form.title,
    };
    const ok = await persist(next, `${uploaded.length} lagu berhasil diunggah.`);
    if (!ok) {
      await supabase.storage.from(BUCKET).remove(uploaded.map((track) => track.path));
    }
    setUploading(false);
  }

  async function chooseTrack(track: MusicTrack) {
    await persist(
      { ...form, track_url: track.url, title: track.title },
      `Lagu aktif diubah menjadi “${track.title}”.`
    );
  }

  async function deleteTrack(track: MusicTrack) {
    const tracks = form.tracks.filter((item) => item.id !== track.id);
    const wasActive = form.track_url === track.url;
    const nextTrack = wasActive ? tracks[0] : null;
    const next = {
      ...form,
      tracks,
      track_url: nextTrack?.url || (wasActive ? "" : form.track_url),
      title: nextTrack?.title || (wasActive ? "REDBOX Background Music" : form.title),
      enabled: wasActive && !nextTrack ? false : form.enabled,
    };
    const ok = await persist(next, `Lagu “${track.title}” dihapus dari playlist.`);
    if (!ok) return;
    const { error } = await supabase.storage.from(BUCKET).remove([track.path]);
    if (error) setNotice(`Lagu dihapus dari playlist, tetapi file Storage belum terhapus: ${error.message}`);
  }

  return (
    <section className="panel" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Pengaturan Website</p>
          <h3 style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Music2 size={19} /> Background Music
          </h3>
        </div>
        <span className="panel-icon"><Volume2 size={18} /></span>
      </div>
      <p className="muted" style={{ margin: "8px 0 22px", lineHeight: 1.7 }}>
        Musik berlaku di semua halaman. Unggah beberapa MP3 untuk membuat playlist, lalu pilih lagu aktif.
        Browser dapat meminta pengunjung menekan Play jika autoplay diblokir.
      </p>
      {loading ? (
        <div className="activity-empty"><Loader2 className="spin-icon" size={18} /> Memuat pengaturan musik...</div>
      ) : (
        <form onSubmit={saveSettings} className="entry-form">
          <label className="music-toggle-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: 15, borderRadius: 12, background: "rgba(128,128,128,.08)" }}>
            <span>
              <b>Aktifkan musik website</b>
              <small style={{ display: "block", opacity: .7, marginTop: 4 }}>Musik akan tersedia bagi semua pengunjung</small>
            </span>
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} style={{ width: 20, height: 20, accentColor: "#dc2626" }} />
          </label>

          <label>Volume awal · {form.volume}%
            <input type="range" min="0" max="100" value={form.volume} onChange={(e) => setForm({ ...form, volume: Number(e.target.value) })} />
          </label>

          <label>Unggah lagu (MP3, OGG, WAV, AAC · maksimal 20 MB per lagu)
            <input type="file" accept="audio/*" multiple onChange={uploadTracks} disabled={uploading || saving} />
          </label>
          {(uploading || saving) && (
            <p className="muted"><Loader2 size={15} className="spin-icon" /> {uploading ? "Mengunggah lagu..." : "Menyimpan..."}</p>
          )}

          <div className="panel" style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 12 }}>
            <b>Playlist ({form.tracks.length} lagu)</b>
            {form.tracks.length === 0 ? (
              <p className="muted">Belum ada lagu yang diunggah.</p>
            ) : (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {form.tracks.map((track) => {
                  const active = form.track_url === track.url;
                  return (
                    <div key={track.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 10, borderRadius: 9, background: active ? "rgba(220,38,38,.08)" : "rgba(128,128,128,.06)" }}>
                      <div style={{ minWidth: 0 }}>
                        <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</b>
                        <small className="muted">{active ? "Lagu aktif" : "Tersimpan"}</small>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {!active && <button type="button" className="icon-btn" disabled={saving || uploading} onClick={() => chooseTrack(track)}>Pilih</button>}
                        <button type="button" className="icon-btn danger-outline" disabled={saving || uploading} onClick={() => deleteTrack(track)} aria-label={`Hapus ${track.title}`}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Atau gunakan URL audio eksternal</summary>
            <label>URL file audio
              <input type="url" value={form.track_url} onChange={(e) => setForm({ ...form, track_url: e.target.value })} placeholder="https://domain.com/audio.mp3" />
            </label>
            <label>Judul lagu
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="REDBOX Store Music" maxLength={80} />
            </label>
          </details>

          <div className="form-actions">
            <button type="submit" className="primary-btn" disabled={saving || uploading}>
              {saving ? <Loader2 size={16} className="spin-icon" /> : <Check size={16} />}
              <span>{saving ? "Menyimpan..." : "Simpan Pengaturan Musik"}</span>
            </button>
          </div>
          {notice && <p className="notice" role="status">{notice}</p>}
        </form>
      )}
    </section>
  );
}
