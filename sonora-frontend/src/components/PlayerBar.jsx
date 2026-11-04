import React, { useRef } from 'react';
import { getCoverUrl } from './TrackCard';

function formatSeconds(secs) {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function PlayerBar({
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
  onShowToast
}) {
  if (!current) return null;

  const progressBarRef = useRef(null);
  const isSaved = saved.includes(current.id);
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      onPlayTrack(randomTrack);
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

  const handleTimelineClick = e => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(fraction * duration);
  };

  return (
    <footer className="player-bar">
      <div className="now-playing">
        <img
          src={getCoverUrl(current)}
          alt="Current track artwork"
          onError={e => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&h=600&q=85';
          }}
        />
        <div>
          <b>{current.title}</b>
          <small>{current.artist}</small>
        </div>
        <button
          className={`heart ${isSaved ? 'liked' : ''}`}
          onClick={() => onToggleSave(current)}
          aria-label="Save current track"
          title={isSaved ? 'Remove from saved' : 'Save track'}
        >
          {isSaved ? '♥' : '♡'}
        </button>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button title="Shuffle" onClick={handleShuffle}>
            ⤨
          </button>
          <button title="Previous" onClick={handlePrev}>
            ◂
          </button>
          <button
            className="play-button"
            onClick={onTogglePlay}
            title={playing ? 'Pause' : 'Play audio preview'}
          >
            {playing ? 'Ⅱ' : '▶'}
          </button>
          <button title="Next" onClick={handleNext}>
            ▸
          </button>
          <button title="Repeat" onClick={() => onShowToast && onShowToast('Repeat mode enabled')}>
            ↻
          </button>
        </div>

        <div className="timeline">
          <span>{formatSeconds(currentTime)}</span>
          <div
            className="progress-track"
            ref={progressBarRef}
            onClick={handleTimelineClick}
            title="Click to seek"
            style={{ cursor: 'pointer' }}
          >
            <i style={{ width: `${progressPercent}%` }} />
          </div>
          <span>{formatSeconds(duration || 30)}</span>
        </div>
      </div>

      <div className="player-extra">
        <div className="volume-control" title={`Volume: ${Math.round(volume * 100)}%`}>
          <button className="vol-btn" onClick={onToggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={e => onVolumeChange(parseFloat(e.target.value))}
            className="volume-slider"
          />
        </div>
        <span className="live-badge" title="Active audio preview stream">
          {playing ? '● LIVE' : 'PREVIEW'}
        </span>
      </div>
    </footer>
  );
}
