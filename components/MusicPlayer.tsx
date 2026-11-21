"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Music2, Pause, Play, Volume2 } from "lucide-react";
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

export default function MusicPlayer() {
  const supabase = useMemo(() => createClient(), []);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [settings, setSettings] = useState<MusicSettings>(DEFAULTS);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      const { data } = await supabase
        .from("site_music")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (active && data) setSettings({ ...DEFAULTS, ...data });
    }
    loadSettings();
    const channel = supabase
      .channel("redbox-site-music")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_music" }, loadSettings)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.min(1, Math.max(0, settings.volume / 100));
    if (!settings.enabled || !settings.track_url) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (audio.src !== settings.track_url) audio.src = settings.track_url;
    audio.load();
    audio.play().then(() => {
      setPlaying(true);
      setBlocked(false);
    }).catch(() => {
      setPlaying(false);
      setBlocked(true);
    });
  }, [settings.enabled, settings.track_url, settings.volume]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !settings.track_url) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
        setBlocked(false);
      } catch {
        setBlocked(true);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  if (!settings.enabled || !settings.track_url) return null;

  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 1000, display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 999, background: "rgba(18,18,20,.94)", color: "#fff", border: "1px solid rgba(255,255,255,.13)", boxShadow: "0 8px 30px rgba(0,0,0,.25)", maxWidth: "calc(100vw - 36px)" }}>
      <audio ref={audioRef} loop preload="none" onEnded={() => setPlaying(false)} />
      <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.12)", flexShrink: 0 }}><Music2 size={15} /></span>
      <span style={{ minWidth: 0, maxWidth: 145, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{settings.title || "REDBOX Music"}</span>
      <button type="button" onClick={togglePlayback} aria-label={playing ? "Jeda musik" : "Putar musik"} title={blocked ? "Browser memerlukan interaksi untuk memutar musik" : undefined} style={{ border: 0, borderRadius: "50%", width: 32, height: 32, display: "grid", placeItems: "center", background: "#fff", color: "#111", cursor: "pointer", flexShrink: 0 }}>
        {playing ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <Volume2 size={14} style={{ opacity: .8, flexShrink: 0 }} />
      <span style={{ fontSize: 11, opacity: .75, flexShrink: 0 }}>{blocked ? "Tekan Play" : "Music"}</span>
    </div>
  );
}
