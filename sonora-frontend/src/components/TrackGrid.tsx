import React from 'react';
import { Track } from '../data/mockTracks';
import { TrackCard } from './TrackCard';

interface TrackGridProps {
  tracks: Track[];
  loading?: boolean;
  saved?: string[];
  currentTrackId?: string;
  isPlaying?: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleSave: (track: Track) => void;
  onSkipTrack: (track: Track) => void;
  onInspectTrack?: (track: Track) => void;
  emptyMessage?: string;
  className?: string;
}

export const TrackGrid: React.FC<TrackGridProps> = ({
  tracks,
  loading = false,
  saved = [],
  currentTrackId,
  isPlaying = false,
  onPlayTrack,
  onToggleSave,
  onSkipTrack,
  onInspectTrack,
  emptyMessage = 'No tracks found for this mood query. Try a different prompt!',
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div
            key={i}
            className="flex flex-col p-3 rounded-2xl bg-[#141417] border border-white/[0.06] animate-pulse"
          >
            {/* Artwork Skeleton */}
            <div className="aspect-square w-full rounded-xl bg-zinc-800/60 mb-3" />
            {/* Title & Artist Skeleton */}
            <div className="h-4 bg-zinc-800/80 rounded w-3/4 mb-2" />
            <div className="h-3 bg-zinc-800/50 rounded w-1/2 mb-4" />
            {/* Badge & Duration Skeleton */}
            <div className="flex justify-between items-center mb-3">
              <div className="h-4 bg-zinc-800/60 rounded-full w-20" />
              <div className="h-3 bg-zinc-800/40 rounded w-8" />
            </div>
            {/* Reason Skeleton */}
            <div className="pt-2 border-t border-white/[0.04]">
              <div className="h-3 bg-zinc-800/50 rounded w-full mb-1.5" />
              <div className="h-3 bg-zinc-800/40 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="py-16 px-6 text-center rounded-2xl bg-[#141417] border border-dashed border-white/[0.1] my-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.05] text-zinc-400 mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white mb-1">No recommendations yet</h3>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}
      role="region"
      aria-label="Track recommendations list"
    >
      {tracks.map(track => {
        const isTrackPlaying = isPlaying && currentTrackId === track.id;
        const isSaved = saved.includes(track.id);

        return (
          <TrackCard
            key={track.id}
            track={track}
            saved={isSaved}
            isPlaying={isTrackPlaying}
            onPlay={() => onPlayTrack(track)}
            onSave={() => onToggleSave(track)}
            onSkip={() => onSkipTrack(track)}
            onInspect={onInspectTrack ? () => onInspectTrack(track) : undefined}
          />
        );
      })}
    </div>
  );
};

export default TrackGrid;
