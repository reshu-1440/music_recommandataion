import React, { useRef, useState } from 'react';
import { Track } from '../data/mockTracks';
import { getCoverUrl } from './TrackCard';
import {
  PlayIcon,
  PauseIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  RepeatIcon,
  VolumeIcon,
  VolumeMuteIcon,
  HeartIcon,
  CpuIcon
} from './icons';

interface PlayerBarProps {
  current: Track | null;
  playing: boolean;
  saved?: string[];
  tracks?: Track[];
  currentTime?: number;
  duration?: number;
  volume?: number;
  isMuted?: boolean;
  onTogglePlay: () => void;
  onToggleSave: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onShowToast?: (message: string) => void;
  onOpenTelemetry?: () => void;
  className?: string;
}

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  current,
  playing,
  saved = [],
  tracks = [],
  currentTime = 0,
  duration = 30,
  volume = 0.8,
  isMuted = false,
  onTogglePlay,
  onToggleSave,
  onPlayTrack,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onShowToast,
  onOpenTelemetry,
  className = ''
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  if (!current) return null;

  const isSaved = saved.includes(current.id);
  const effectiveDuration = duration > 0 ? duration : 30;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      onPlayTrack(randomTrack);
      onShowToast && onShowToast(`Shuffled: ${randomTrack.title}`);
    }
  };

  const handlePrev = () => {
    if (tracks.length > 0) {
      const idx = tracks.findIndex(t => t.id === current.id);
      const prevIdx = (idx - 1 + tracks.length) % tracks.length;
      onPlayTrack(tracks[prevIdx]);
    }
  };

  const handleNext = () => {
    if (tracks.length > 0) {
      const idx = tracks.findIndex(t => t.id === current.id);
      const nextIdx = (idx + 1 + tracks.length) % tracks.length;
      onPlayTrack(tracks[nextIdx]);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || effectiveDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(fraction * effectiveDuration);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || effectiveDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    setHoverTime(fraction * effectiveDuration);
  };

  return (
    <footer
      className={`fixed bottom-0 left-0 right-0 z-40 h-[84px] bg-[#0E0E11]/90 backdrop-blur-xl border-t border-white/[0.08] px-4 sm:px-6 flex items-center justify-between select-none shadow-[0_-8px_32px_rgba(0,0,0,0.7)] ${className}`}
      role="region"
      aria-label="Now playing audio player"
    >
      {/* Left Column: Track Info & Heart */}
      <div className="flex items-center gap-3 min-w-0 w-1/4 sm:w-[280px]">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-white/[0.08] shadow-sm">
          <img
            src={getCoverUrl(current)}
            alt={`${current.title} artwork`}
            className="w-full h-full object-cover"
          />
          {playing && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[#C6F26B] shadow-[0_0_8px_#C6F26B]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-white truncate" title={current.title}>
            {current.title}
          </h4>
          <p className="text-xs text-zinc-400 truncate mt-0.5" title={current.artist}>
            {current.artist}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleSave(current)}
          aria-label={isSaved ? 'Remove from saved' : 'Save track'}
          className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F26B]/50 shrink-0"
        >
          <HeartIcon size={17} filled={isSaved} />
        </button>
      </div>

      {/* Center Column: Transport Controls & Scrubber */}
      <div className="flex-1 max-w-2xl px-2 sm:px-6 flex flex-col items-center justify-center gap-1.5">
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={handleShuffle}
            aria-label="Shuffle recommendations"
            title="Shuffle"
            className="p-1 text-zinc-400 hover:text-white bg-transparent transition-colors hidden sm:block focus-visible:outline-none"
          >
            <ShuffleIcon size={16} />
          </button>

          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous track"
            title="Previous track"
            className="p-1 text-zinc-400 hover:text-white bg-transparent transition-colors focus-visible:outline-none"
          >
            <SkipBackIcon size={17} />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? 'Pause' : 'Play preview stream'}
            className="w-10 h-10 rounded-full bg-white hover:bg-zinc-100 text-[#0B0B0C] flex items-center justify-center transition-all duration-150 active:scale-95 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F26B]"
          >
            {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next track"
            title="Next track"
            className="p-1 text-zinc-400 hover:text-white bg-transparent transition-colors focus-visible:outline-none"
          >
            <SkipForwardIcon size={17} />
          </button>

          <button
            type="button"
            onClick={() => onShowToast && onShowToast('Loop mode active')}
            aria-label="Repeat mode"
            title="Repeat"
            className="p-1 text-zinc-400 hover:text-white bg-transparent transition-colors hidden sm:block focus-visible:outline-none"
          >
            <RepeatIcon size={16} />
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="w-full flex items-center gap-2.5">
          <span className="text-[11px] font-medium text-zinc-400 w-8 text-right tabular-nums">
            {formatSeconds(currentTime)}
          </span>

          <div
            ref={progressBarRef}
            onClick={handleTimelineClick}
            onMouseEnter={() => setIsHoveringTimeline(true)}
            onMouseLeave={() => {
              setIsHoveringTimeline(false);
              setHoverTime(null);
            }}
            onMouseMove={handleTimelineMouseMove}
            className="relative flex-1 h-1.5 hover:h-2 bg-zinc-800 rounded-full cursor-pointer transition-all duration-150 group"
          >
            {/* Scrubber Progress Fill */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-[#C6F26B] rounded-full transition-[width] duration-75"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Scrubber Thumb Knob on Hover */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `${progressPercent}%` }}
            />

            {/* Hover Tooltip Time */}
            {isHoveringTimeline && hoverTime !== null && (
              <div
                className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-medium text-white shadow pointer-events-none"
                style={{ left: `${(hoverTime / effectiveDuration) * 100}%` }}
              >
                {formatSeconds(hoverTime)}
              </div>
            )}
          </div>

          <span className="text-[11px] font-medium text-zinc-400 w-8 tabular-nums">
            {formatSeconds(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* Right Column: Volume, Preview Badge & Telemetry Button */}
      <div className="flex items-center justify-end gap-3 sm:gap-4 w-1/4 sm:w-[280px]">
        {/* Telemetry Inspect Trigger */}
        {onOpenTelemetry && (
          <button
            type="button"
            onClick={onOpenTelemetry}
            aria-label="Inspect audio telemetry and semantic vectors"
            title="Inspect Vector Telemetry"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-transparent hover:bg-white/[0.08] transition-colors hidden md:flex items-center gap-1.5 text-xs focus-visible:outline-none"
          >
            <CpuIcon size={16} />
            <span className="text-[11px] font-medium">Specs</span>
          </button>
        )}

        {/* Volume Scrubber */}
        <div className="items-center gap-2 hidden lg:flex">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute volume' : 'Mute volume'}
            className="p-1 text-zinc-400 hover:text-white bg-transparent transition-colors focus-visible:outline-none"
          >
            {isMuted || volume === 0 ? <VolumeMuteIcon size={16} /> : <VolumeIcon size={16} />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={e => onVolumeChange(parseFloat(e.target.value))}
            aria-label="Player volume"
            className="w-16 h-1 accent-[#C6F26B] bg-zinc-800 rounded-full cursor-pointer transition-opacity"
          />
        </div>

        {/* Preview Badge */}
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-white/[0.06] border border-white/[0.08] text-zinc-300">
          {playing ? 'Previewing' : 'Preview'}
        </span>
      </div>
    </footer>
  );
};

export default PlayerBar;
