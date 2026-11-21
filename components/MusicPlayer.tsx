"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type MusicTrack = { id: string; path?: string; url: string; title: string };
type MusicSettings = {
  id: number;
  enabled: boolean;
  track_url: string;
  title: string;
  volume: number;
  tracks?: MusicTrack[];
};

const DEFAULTS: MusicSettings = {
  id: 1,
  enabled: false,
  track_url: "",
  title: "REDBOX Background Music",
  volume: 35,
  tracks: [],
};

export default function MusicPlayer() {
  const supabase = useMemo(() => createClient(), []);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [settings, setSettings] = useState<MusicSettings>(DEFAULTS);
  const [trackIndex, setTrackIndex] = useState(0);
  const [volume, setVolume] = useState(DEFAULTS.volume);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const tracks = useMemo<MusicTrack[]>(() => {
    const uploaded = settings.tracks || [];
    if (settings.track_url && !uploaded.some((track) => track.url === settings.track_url)) {
      return [
        { id: "external-track", url: settings.track_url, title: settings.title || "REDBOX Music" },
        ...uploaded,
      ];
    }
    return uploaded;
  }, [settings.tracks, settings.track_url, settings.title]);

  const currentTrack = settings.track_url ? tracks[trackIndex] || null : null;

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      const { data } = await supabase
        .from("site_music")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (active && data) {
        const next = { ...DEFAULTS, ...data, tracks: Array.isArray(data.tracks) ? data.tracks : [] };
        setSettings(next);
        setVolume(next.volume);
        const selected = (next.tracks as MusicTrack[]).findIndex((track) => track.url === next.track_url);
        setTrackIndex(selected >= 0 ? selected : 0);
      }
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
    if (audio) audio.volume = Math.min(1, Math.max(0, volume / 100));
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !settings.enabled || !currentTrack?.url) {
      audio?.pause();
      setPlaying(false);
      return;
    }

    setAudioError(false);
    if (audio.getAttribute("src") !== currentTrack.url) {
      audio.src = currentTrack.url;
      audio.load();
    }
    audio.play().then(() => {
      setPlaying(true);
      setBlocked(false);
    }).catch(() => {
      setPlaying(false);
      setBlocked(true);
    });
  }, [settings.enabled, currentTrack?.url]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.url) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
        setBlocked(false);
        setAudioError(false);
      } catch {
        setBlocked(true);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function changeTrack(direction: -1 | 1) {
    if (tracks.length < 2) return;
    setTrackIndex((current) => (current + direction + tracks.length) % tracks.length);
  }

  function handleEnded() {
    if (tracks.length > 1) changeTrack(1);
    else setPlaying(false);
  }

  if (!settings.enabled || !currentTrack?.url) return null;

  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 1000, display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 18, background: "rgba(18,18,20,.96)", color: "#fff", border: "1px solid rgba(255,255,255,.13)", boxShadow: "0 8px 30px rgba(0,0,0,.25)", maxWidth: "calc(100vw - 28px)" }}>
      <audio ref={audioRef} loop={tracks.length === 1} preload="none" onEnded={handleEnded} onError={() => { setPlaying(false); setAudioError(true); }} />
      <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.12)", flexShrink: 0 }}><Music2 size={15} /></span>
      <span style={{ minWidth: 0, maxWidth: 135, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={currentTrack.title}>{currentTrack.title}</span>
      {tracks.length > 1 && <button type="button" onClick={() => changeTrack(-1)} aria-label="Lagu sebelumnya" style={controlStyle}><SkipBack size={14} /></button>}
      <button type="button" onClick={togglePlayback} aria-label={playing ? "Jeda musik" : "Putar musik"} title={blocked ? "Browser memerlukan interaksi untuk memutar musik" : undefined} style={{ ...controlStyle, background: "#fff", color: "#111" }}>
        {playing ? <Pause size={15} /> : <Play size={15} />}
      </button>
      {tracks.length > 1 && <button type="button" onClick={() => changeTrack(1)} aria-label="Lagu berikutnya" style={controlStyle}><SkipForward size={14} /></button>}
      <label style={{ display: "flex", alignItems: "center", gap: 5 }} title={`Volume ${volume}%`}>
        <Volume2 size={14} />
        <input aria-label="Volume musik" type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} style={{ width: 58, accentColor: "#fff" }} />
      </label>
      <span style={{ fontSize: 10, opacity: .75, whiteSpace: "nowrap" }}>{audioError ? "Audio gagal" : blocked ? "Tekan Play" : "REDBOX"}</span>
    </div>
  );
}

const controlStyle: React.CSSProperties = {
  border: 0,
  borderRadius: "50%",
  width: 30,
  height: 30,
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,.12)",
  color: "#fff",
  cursor: "pointer",
  flexShrink: 0,
};
