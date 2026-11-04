import React, { useState } from 'react';
import { Track, formatHumanReason } from '../data/mockTracks';
import { MatchBadge } from './MatchBadge';
import { HeartIcon, PlayIcon, PauseIcon, DislikeIcon, InfoIcon } from './icons';

export const getCoverUrl = (track: Partial<Track>): string => {
  if (!track) {
    return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&h=600&q=85';
  }
  if (track.image_url && track.image_url.startsWith('http')) {
    return track.image_url;
  }
  // @ts-ignore
  if (track.image && track.image.startsWith('http')) {
    // @ts-ignore
    return track.image;
  }
  return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&h=600&q=85';
};

interface TrackCardProps {
  track: Track;
  saved?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
  onSave?: () => void;
  onSkip?: () => void;
  onInspect?: () => void;
  className?: string;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  saved = false,
  isPlaying = false,
  onPlay,
  onSave,
  onSkip,
  onInspect,
  className = ''
}) => {
  const [imgError, setImgError] = useState(false);
  const humanReason = formatHumanReason(track);

  return (
    <article
      tabIndex={0}
      className={`group relative flex flex-col p-3 rounded-2xl bg-[#141417] border border-white/[0.06] transition-all duration-200 hover:border-white/[0.14] hover:bg-[#18181C] hover:shadow-[0_12px_28px_rgba(0,0,0,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F26B]/70 ${
        isPlaying ? 'border-[#C6F26B]/40 ring-1 ring-[#C6F26B]/20 bg-[#161719]' : ''
      } ${className}`}
    >
      {/* Cover art with hover scale & play overlay */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 select-none mb-3">
        <img
          src={imgError ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&h=600&q=85' : getCoverUrl(track)}
          alt={`${track.title} artwork by ${track.artist}`}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />

        {/* Ambient subtle vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Genre tag pill (shown on hover or discrete) */}
        <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-black/60 backdrop-blur-md text-zinc-300 border border-white/[0.1]">
            {track.genre ? track.genre.split('·')[0].trim() : 'Curated'}
          </span>
        </div>

        {/* Play/Pause Button Overlay */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onPlay && onPlay();
          }}
          aria-label={isPlaying ? `Pause ${track.title}` : `Play preview of ${track.title}`}
          className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F26B] ${
            isPlaying
              ? 'opacity-100 scale-100 bg-[#C6F26B] text-[#0B0B0C] shadow-[0_0_16px_rgba(198,242,107,0.4)]'
              : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 bg-white text-zinc-950 hover:scale-105 active:scale-95'
          }`}
        >
          {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} className="ml-0.5" />}
        </button>

        {/* Playing waveform animation indicator */}
        {isPlaying && (
          <div className="absolute bottom-3 left-3 flex items-end gap-0.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md">
            <span className="w-1 h-3 bg-[#C6F26B] rounded-full animate-pulse" />
            <span className="w-1 h-4 bg-[#C6F26B] rounded-full animate-pulse [animation-delay:150ms]" />
            <span className="w-1 h-2 bg-[#C6F26B] rounded-full animate-pulse [animation-delay:300ms]" />
          </div>
        )}
      </div>

      {/* Title & Heart Row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <h4
            className="text-sm font-semibold text-white tracking-tight truncate group-hover:text-zinc-100"
            title={track.title}
          >
            {track.title}
          </h4>
          <p className="text-xs text-zinc-400 truncate mt-0.5" title={track.artist}>
            {track.artist}
          </p>
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onSave && onSave();
          }}
          aria-label={saved ? `Remove ${track.title} from library` : `Save ${track.title} to library`}
          className="p-1 rounded-full text-zinc-400 hover:text-white bg-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F26B]/50"
        >
          <HeartIcon size={17} filled={saved} />
        </button>
      </div>

      {/* Metadata Row: Match Badge + Duration */}
      <div className="flex items-center justify-between gap-2 mt-2 mb-2.5">
        <MatchBadge score={track.score || `${track.match_pct || 98}%`} />
        <span className="text-[11px] font-medium text-zinc-400 tabular-nums">
          {track.duration || '3:30'}
        </span>
      </div>

      {/* 1-Line Human-Readable Reason (<80 characters) */}
      <div className="pt-2 border-t border-white/[0.06] flex-1 flex flex-col justify-between">
        <p className="text-xs text-zinc-300 leading-snug line-clamp-2 min-h-[34px]" title={track.technical_reason || track.reason}>
          {humanReason}
        </p>

        {/* Card Actions Footer: Accessible "Not for me" & Inspect drawer */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-1">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onSkip && onSkip();
            }}
            aria-label={`Skip ${track.title} and tune recommendation preferences`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 bg-transparent transition-colors focus-visible:outline-none"
          >
            <DislikeIcon size={12} />
            <span>Not for me</span>
          </button>

          {onInspect && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onInspect();
              }}
              title="Inspect vector embedding & semantic ID"
              aria-label="Inspect semantic details"
              className="p-1 text-zinc-500 hover:text-zinc-300 bg-transparent transition-colors focus-visible:outline-none"
            >
              <InfoIcon size={14} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default TrackCard;
