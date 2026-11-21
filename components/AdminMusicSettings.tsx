"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Music2, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type MusicSettings = {
  id: number;
  enabled: boolean;
  track_url: string;
  title: string;
  volume: number;
};

const DEFAULTS: MusicSettings = {
  id: 1,
  enabled: false,
  track_url: "",
  title: "REDBOX Background Music",
  volume: 35,
};

export default function AdminMusicSettings() {
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<MusicSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    supabase.from("site_music").select("*").eq("id", 1).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (data) setForm({ ...DEFAULTS, ...data });
      if (error && !error.message.toLowerCase().includes("does not exist")) setNotice(error.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, [supabase]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    const url = form.track_url.trim();
    if (url && !/^https?:\\/\\//i.test(url)) {
      setNotice("URL musik harus diawali http:// atau https://");
      return;
    }
    setSaving(true);
    setNotice("");
    const { error } = await supabase.from("site_music").upsert({
      id: 1,
      enabled: form.enabled,
      track_url: url,
      title: form.title.trim() || "REDBOX Background Music",
      volume: Math.min(100, Math.max(0, Number(form.volume) || 0)),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    setSaving(false);
    setNotice(error ? error.message : "Pengaturan musik berhasil disimpan dan diperbarui untuk seluruh pengunjung.");
  }

  return (
    <section className="panel" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Pengaturan Website</p>
          <h3 style={{ display: "flex", alignItems: "center", gap: 9 }}><Music2 size={19} /> Background Music</h3>
        </div>
        <span className="panel-icon"><Volume2 size={18} /></span>
      </div>
      <p className="muted" style={{ margin: "8px 0 22px", lineHeight: 1.7 }}>
        Musik ini berlaku di semua halaman website dan akan diputar berulang. Gunakan URL file audio MP3/OGG yang bisa diakses publik, bukan link halaman pemutar musik.
      </p>
      {loading ? <div className="activity-empty"><Loader2 className="spin-icon" size={18} /> Memuat pengaturan musik...</div> : (
        <form onSubmit={saveSettings} className="entry-form">
          <label className="music-toggle-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: 15, borderRadius: 12, background: "rgba(128,128,128,.08)" }}>
            <span><b>Aktifkan musik website</b><small style={{ display: "block", opacity: .7, marginTop: 4 }}>Pengunjung dapat mendengarkan musik saat membuka website</small></span>
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} style={{ width: 20, height: 20, accentColor: "#dc2626" }} />
          </label>
          <label>Judul musik
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: REDBOX Store Music" maxLength={80} />
          </label>
          <label>URL file musik
            <input type="url" value={form.track_url} onChange={(e) => setForm({ ...form, track_url: e.target.value })} placeholder="https://domain.com/audio.mp3" />
          </label>
          <label>Volume awal · {form.volume}%
            <input type="range" min="0" max="100" value={form.volume} onChange={(e) => setForm({ ...form, volume: Number(e.target.value) })} />
          </label>
          <div className="form-actions">
            <button type="submit" className="primary-btn" disabled={saving || loading}>
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
