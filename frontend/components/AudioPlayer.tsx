"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Download, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string | null;
  title: string;
  playing?: boolean;
  onTogglePlay?: () => void;
  onEnded?: () => void;
  downloadUrl?: string;
}

export default function AudioPlayer({ audioUrl, title, playing = false, onTogglePlay, onEnded, downloadUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const prevPlaying = useRef(playing);

  // Sync play state with external control
  useEffect(() => {
    if (!audioRef.current) return;
    if (playing && !prevPlaying.current) {
      audioRef.current.play().catch(() => {});
    } else if (!playing && prevPlaying.current) {
      audioRef.current.pause();
    }
    prevPlaying.current = playing;
  }, [playing]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      if (playing) audioRef.current.play().catch(() => {});
      setCurrentTime(0);
    }
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    onTogglePlay?.();
  }, [onTogglePlay]);

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };
  const handleLoaded = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };
  const handleEnded = () => {
    prevPlaying.current = false;
    onEnded?.();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };
  const progress = duration ? (currentTime / duration) * 100 : 0;

  if (!audioUrl) {
    return (
      <div className="card p-8 text-center">
        <Volume2 className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-[var(--text-secondary)] font-medium">No audio available yet</p>
        <p className="text-sm text-[var(--text-muted)] mt-1">Select a chapter to start listening</p>
      </div>
    );
  }

  return (
    <div className="card p-5 animate-fade-in">
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoaded} onEnded={handleEnded} />

      <p className="text-sm font-medium text-[var(--text)] mb-4 truncate flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
        {title}
      </p>

      <div className="relative mb-3">
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full cursor-pointer group overflow-hidden" onClick={seek}>
          <div className="h-full bg-gradient-to-r from-[var(--primary)] to-indigo-400 rounded-full relative transition-all duration-100" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[var(--primary)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
          </div>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-[var(--text-muted)]">{formatTime(currentTime)}</span>
          <span className="text-xs text-[var(--text-muted)]">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="w-20" />
        <div className="flex items-center gap-3">
          <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10); }} className="btn-ghost p-2">
            <SkipBack className="w-4 h-4" />
          </button>
          <button onClick={togglePlay} className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-indigo-700 rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-[var(--primary)]/20 active:scale-95 transition-all">
            {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
          </button>
          <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 10); }} className="btn-ghost p-2">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
        <div className="w-20 flex items-center justify-end gap-1">
          <div className="relative">
            <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="btn-ghost text-xs font-mono font-medium text-[var(--text-secondary)] px-2 py-1">{speed}x</button>
            {showSpeedMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSpeedMenu(false)} />
                <div className="absolute bottom-full right-0 mb-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 min-w-[80px]">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button key={s} onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                      className={`w-full px-4 py-1.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${speed === s ? "text-[var(--primary)] font-semibold" : "text-[var(--text-secondary)]"}`}>{s}x</button>
                  ))}
                </div>
              </>
            )}
          </div>
          {downloadUrl && <a href={downloadUrl} download className="btn-ghost p-2"><Download className="w-4 h-4" /></a>}
        </div>
      </div>
    </div>
  );
}
