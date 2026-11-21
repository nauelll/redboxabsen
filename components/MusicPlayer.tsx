"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown, Music2, Pause, Play, SkipBack, SkipForward, Volume2, Waves,
} from "lucide-react";
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
  id: 1, enabled: false, track_url: "", title: "REDBOX Background Music",
  volume: 35, tracks: [],
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
  const [expanded, setExpanded] = useState(false);

  const tracks = useMemo<MusicTrack[]>(() => {
    const uploaded = settings.tracks || [];
    if (settings.track_url && !uploaded.some((track) => track.url === settings.track_url)) {
      return [{ id: "external-track", url: settings.track_url, title: settings.title || "REDBOX Music" }, ...uploaded];
    }
    return uploaded;
  }, [settings.tracks, settings.track_url, settings.title]);

  const currentTrack = settings.track_url ? tracks[trackIndex] || null : null;

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      const { data } = await supabase.from("site_music").select("*").eq("id", 1).maybeSingle();
      if (active && data) {
        const next = { ...DEFAULTS, ...data, tracks: Array.isArray(data.tracks) ? data.tracks : [] };
        setSettings(next);
        setVolume(next.volume);
        const selected = (next.tracks as MusicTrack[]).findIndex((track) => track.url === next.track_url);
        setTrackIndex(selected >= 0 ? selected : 0);
      }
    }
    loadSettings();
    const channel = supabase.channel("redbox-site-music")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_music" }, loadSettings)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
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
    if (tracks.length > 1) setTrackIndex((current) => (current + direction + tracks.length) % tracks.length);
  }

  function handleEnded() {
    if (tracks.length > 1) changeTrack(1);
    else setPlaying(false);
  }

  if (!settings.enabled || !currentTrack?.url) return null;

  return (
    <>
      <audio ref={audioRef} loop={tracks.length === 1} preload="none" onEnded={handleEnded}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onError={() => { setPlaying(false); setAudioError(true); }} />

      {!expanded ? (
        <button className="music-mini" type="button" onClick={() => setExpanded(true)}
          aria-label="Buka pemutar musik" title="Buka pemutar musik">
          <span className={`music-wave ${playing ? "is-playing" : ""}`} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((bar) => <i key={bar} />)}
          </span>
          <span className="music-mini-label">MUSIC</span>
        </button>
      ) : (
        <section className="music-widget" aria-label="Pemutar musik REDBOX">
          <div className="music-widget-top">
            <span className={`music-wave ${playing ? "is-playing" : ""}`} aria-hidden="true">
              {[0, 1, 2, 3, 4].map((bar) => <i key={bar} />)}
            </span>
            <div className="music-track-copy">
              <strong>REDBOX MUSIC</strong>
              <span title={currentTrack.title}>{currentTrack.title}</span>
            </div>
            <button className="music-icon-btn music-hide" type="button" onClick={() => setExpanded(false)}
              aria-label="Sembunyikan pemutar musik" title="Sembunyikan"><ChevronDown size={18} /></button>
          </div>

          <div className="music-widget-controls">
            {tracks.length > 1 && <button className="music-icon-btn" type="button" onClick={() => changeTrack(-1)} aria-label="Lagu sebelumnya"><SkipBack size={17} /></button>}
            <button className="music-play-btn" type="button" onClick={togglePlayback}
              aria-label={playing ? "Jeda musik" : "Putar musik"}><>{playing ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</></button>
            {tracks.length > 1 && <button className="music-icon-btn" type="button" onClick={() => changeTrack(1)} aria-label="Lagu berikutnya"><SkipForward size={17} /></button>}
            <label className="music-volume" title={`Volume ${volume}%`}>
              <Volume2 size={16} />
              <input aria-label="Volume musik" type="range" min="0" max="100" value={volume}
                onChange={(event) => setVolume(Number(event.target.value))} />
            </label>
          </div>
          <p className="music-status">{audioError ? "File musik tidak dapat diputar" : blocked ? "Tekan Play untuk mulai mendengarkan" : playing ? "Sedang diputar" : "Musik dijeda"}</p>
        </section>
      )}

      <style jsx>{`
        .music-mini,.music-widget{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:1000;color:#fff;background:rgba(17,17,20,.96);border:1px solid rgba(255,255,255,.13);box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
        .music-mini{height:48px;min-width:66px;padding:0 13px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
        .music-mini-label{font-size:9px;font-weight:800;letter-spacing:.13em;color:rgba(255,255,255,.8)}
        .music-widget{width:min(290px,calc(100vw - 28px));padding:13px 14px 10px;border-radius:18px}
        .music-widget-top{display:flex;align-items:center;gap:10px;min-width:0}
        .music-track-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:3px}
        .music-track-copy strong{font-size:9px;letter-spacing:.14em;color:#ff6578}
        .music-track-copy span{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .music-wave{height:26px;display:flex;align-items:center;justify-content:center;gap:3px;flex:none;width:27px}
        .music-wave i{display:block;width:3px;height:7px;border-radius:5px;background:#ff304b;transform-origin:center}
        .music-wave.is-playing i{animation:music-wave .72s ease-in-out infinite alternate}
        .music-wave.is-playing i:nth-child(2){animation-delay:-.48s}.music-wave.is-playing i:nth-child(3){animation-delay:-.2s}.music-wave.is-playing i:nth-child(4){animation-delay:-.58s}.music-wave.is-playing i:nth-child(5){animation-delay:-.34s}
        .music-icon-btn,.music-play-btn{border:0;display:grid;place-items:center;flex:none;cursor:pointer}
        .music-icon-btn{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.1);color:#fff}
        .music-hide{width:30px;height:30px;background:transparent;color:rgba(255,255,255,.65)}
        .music-play-btn{width:42px;height:42px;border-radius:50%;background:#fff;color:#151515}
        .music-widget-controls{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:13px}
        .music-volume{display:flex;align-items:center;gap:7px;margin-left:auto;color:rgba(255,255,255,.8)}
        .music-volume input{width:76px;accent-color:#ff304b}
        .music-status{margin:8px 0 0;text-align:center;font-size:10px;color:rgba(255,255,255,.55)}
        @keyframes music-wave{from{height:5px}to{height:23px}}
        @media(max-width:480px){.music-mini{right:12px;bottom:calc(12px + env(safe-area-inset-bottom))}.music-widget{right:12px;bottom:calc(12px + env(safe-area-inset-bottom));width:min(280px,calc(100vw - 24px))}}
        @media(prefers-reduced-motion:reduce){.music-wave.is-playing i{animation:none;height:10px}}
      `}</style>
    </>
  );
}
