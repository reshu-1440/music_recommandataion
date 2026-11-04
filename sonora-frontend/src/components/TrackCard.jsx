import React from 'react';

export const getCoverUrl = track => {
  if (!track) {
    return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&h=600&q=85';
  }
  if (track.image_url && track.image_url.startsWith('http')) {
    return track.image_url;
  }
  if (track.image && track.image.startsWith('http')) {
    return track.image;
  }
  if (track.image) {
    return `https://images.unsplash.com/${track.image}?auto=format&fit=crop&w=600&h=600&q=85`;
  }
  return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&h=600&q=85';
};

export default function TrackCard({ track, saved, isPlaying = false, onPlay, onSave, onSkip }) {
  return (
    <article className={`track-card ${isPlaying ? 'playing' : ''}`}>
      <div className="artwork">
        <img
          src={getCoverUrl(track)}
          alt={`${track.title} artwork`}
          loading="lazy"
          onError={e => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&h=600&q=85';
          }}
        />
        <button
          className={`art-play ${isPlaying ? 'active' : ''}`}
          onClick={onPlay}
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          title={isPlaying ? 'Pause' : 'Play preview'}
        >
          {isPlaying ? 'Ⅱ' : '▶'}
        </button>
      </div>
      <div className="track-title-row">
        <div className="track-name">
          <b title={track.title}>{track.title}</b>
          <small>{track.artist}</small>
        </div>
        <button
          className={`heart ${saved ? 'liked' : ''}`}
          onClick={onSave}
          aria-label="Save track"
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>
      <div className="genre">{track.genre}</div>
      <div className="match-row">
        <span className="tag">{track.score} match</span>
        <small>{track.duration}</small>
      </div>
      <div className="card-divider" />
      <p className="reason">{track.reason}</p>
      <div className="card-bottom">
        <code title="Discrete RQ-KMeans Semantic ID">{track.id}</code>
        <button onClick={onSkip} title="Log negative preference feedback">
          Not for me
        </button>
      </div>
    </article>
  );
}
