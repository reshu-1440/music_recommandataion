import React, { useMemo, useState, useEffect } from 'react';
import { useSonoraDiscovery } from './hooks/useSonoraDiscovery';

const FALLBACK_SEED_TRACK = {
  title: 'Tranquil Breath',
  artist: "Dustin O'Halloran",
  genre: 'Piano · Ambient',
  duration: '3:20',
  score: '98%',
  id: 'SID-11-00-12-13',
  semantic_id: 'SID-11-00-12-13',
  image: 'photo-1500530855697-b586d89ba3ee',
  reason: 'Slow acoustic textures and minimal rhythmic movement create a focused study atmosphere.'
};

const cover = t => {
  if (!t || !t.image) {
    return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=520&h=520&q=85';
  }
  if (t.image.startsWith('http')) return t.image;
  return `https://images.unsplash.com/${t.image}?auto=format&fit=crop&w=520&h=520&q=85`;
};

export default function App() {
  const {
    prompt,
    setPrompt,
    generatedPrompt,
    mode,
    setMode,
    tracks,
    loading,
    backendHealthy,
    intentDimensions,
    overallReasoning,
    retrievalSnapshot,
    saved,
    skipped,
    played,
    history,
    dpoTraining,
    dpoResult,
    discover,
    handlePlay,
    handleToggleSave,
    handleSkip,
    handleTrainDPO
  } = useSonoraDiscovery('listener_01');

  const [tab, setTab] = useState('tracks');
  const [nav, setNav] = useState('Discover');
  const [current, setCurrent] = useState(FALLBACK_SEED_TRACK);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState('');

  // Synchronize current track when tracks load
  useEffect(() => {
    if (tracks && tracks.length > 0 && (!current || current.id === FALLBACK_SEED_TRACK.id)) {
      setCurrent(tracks[0]);
    }
  }, [tracks, current]);

  const showToast = message => {
    setToast(message);
    window.clearTimeout(window.__sonoraToast);
    window.__sonoraToast = window.setTimeout(() => setToast(''), 2400);
  };

  const playTrack = track => {
    setCurrent(track);
    setPlaying(true);
    handlePlay(track);
    showToast(`Now playing: ${track.title} · Sonora Player`);
  };

  const toggleSave = async track => {
    const res = await handleToggleSave(track);
    showToast(res.saved ? 'Added to your saved tracks' : 'Removed from saved tracks');
  };

  const skipTrack = track => {
    handleSkip(track);
    showToast(`Feedback recorded: "${track.title}" skipped`);
  };

  const handleSearchSubmit = async () => {
    if (!prompt.trim()) return showToast('Describe the mood you want to hear first');
    const nextMode = /new|different|unexpected|explore|unusual|stretch/i.test(prompt) ? 'explore' : mode;
    showToast('Consulting Gemini & FAISS index...');
    const res = await discover(prompt, nextMode);
    if (res && res.success) {
      showToast(`Generated ${res.count} recommendations via Semantic IDs`);
    } else if (res && res.error) {
      showToast(`Notice: ${res.error}`);
    }
    setTab('tracks');
    setNav('Discover');
  };

  const selectNav = name => {
    setNav(name);
    if (name === 'Discover') {
      setTab('tracks');
      return;
    }
    if (name === 'Saved Tracks' || name === 'Your Library') {
      setTab('library');
    } else {
      showToast(`${name} · Collection view`);
    }
  };

  const visibleSaved = useMemo(() => {
    return tracks.filter(t => saved.includes(t.id));
  }, [tracks, saved]);

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><i /></span>
          <span>SONORA</span>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {['Discover', 'Your Library', 'Saved Tracks'].map((n, i) => (
            <button
              key={n}
              className={`nav-item ${nav === n ? 'active' : ''}`}
              onClick={() => selectNav(n)}
            >
              <span className="nav-symbol">{['◈', '▤', '♡'][i]}</span>
              {n}
            </button>
          ))}
        </nav>
        <div className="side-divider" />
        <div className="side-label">YOUR COLLECTIONS</div>
        {['Late Night Focus', 'Quiet Mornings', 'Beyond Your Usual'].map(n => (
          <button
            key={n}
            className={`nav-item collection ${nav === n ? 'active' : ''}`}
            onClick={() => selectNav(n)}
          >
            {n}
          </button>
        ))}
        <div className="profile-card">
          <div className="side-label">YOUR DISCOVERY PROFILE</div>
          <strong>{saved.length > 2 ? 'Calibrated' : 'Still evolving'}</strong>
          <div className="profile-progress">
            <span style={{ width: `${Math.min(100, Math.max(20, (saved.length + played.length) * 15))}%` }} />
          </div>
          <small>
            {saved.length + skipped.length > 0
              ? `${saved.length + skipped.length} preference signals tracked.`
              : 'Preferences adapt as you listen.'}
          </small>
        </div>
        <div className="user-row">
          <div className="avatar">L</div>
          <div>
            <b>Listener 01</b>
            <small>Personalized flywheel</small>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="mobile-brand">SONORA&nbsp; / &nbsp;</span>
            <span>Language Discovery</span>
            <b>/</b>
            {nav}
          </div>
          <div className="top-right">
            <div className="status-pill">
              <span className="status-dot" />
              <span>{backendHealthy ? 'FASTAPI + GEMINI + FAISS' : 'LOCAL SIMULATION'}</span>
            </div>
            <div className="avatar">L</div>
          </div>
        </header>

        {nav === 'Saved Tracks' || nav === 'Your Library' ? (
          <section className="library-page">
            <div className="eyebrow">YOUR MUSIC</div>
            <h1>{nav}</h1>
            <p className="subcopy">Your saved discoveries, preserved from the recommendation flywheel.</p>
            {visibleSaved.length ? (
              <div className="track-grid">
                {visibleSaved.map(t => (
                  <TrackCard
                    key={t.id}
                    track={t}
                    saved={saved.includes(t.id)}
                    onPlay={() => playTrack(t)}
                    onSave={() => toggleSave(t)}
                    onSkip={() => skipTrack(t)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                No saved tracks in this session yet. Click the heart icon on any recommendation to save it.
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Intro Section */}
            <section className="intro">
              <div className="eyebrow">LANGUAGE-STEERABLE DISCOVERY</div>
              <h1>
                Music that gets<br />
                <em>where you're at.</em>
              </h1>
              <p>
                Describe the moment, the mood, or the exact sound you want. Powered by discrete Semantic IDs,
                GLIDE diversity switches, and preference feedback loops.
              </p>
            </section>

            {/* Natural Language Prompt Search Panel */}
            <section className="search-panel">
              <div className="search-heading">
                <label htmlFor="mood-prompt">Describe your listening mood</label>
                <span>NATURAL LANGUAGE SEARCH</span>
              </div>
              <textarea
                id="mood-prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Something calm for a 3 a.m. study session, with soft vocals and no distracting beats..."
                rows={3}
              />
              <div className="search-bottom">
                <div className="examples">
                  {[
                    ['Late Night 3 AM', 'Something calm for a 3 a.m. study session, with soft vocals and no distracting beats'],
                    ['Deep focus', 'Instrumental music for deep focus, minimal acoustic piano and atmospheric textures'],
                    ['Heavy workout', 'High energy driving electronic beats with aggressive rhythm for gym training'],
                    ['Rainy Sunday', 'Music for a rainy Sunday morning, warm acoustic strings and nostalgic feel']
                  ].map(([label, value]) => (
                    <button
                      key={label}
                      className="chip"
                      onClick={() => {
                        setPrompt(value);
                        discover(value, mode);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button className="primary-button" onClick={handleSearchSubmit} disabled={loading}>
                  {loading ? 'Discovering...' : 'Find my sound'} <span>→</span>
                </button>
              </div>
            </section>

            {/* Mix Heading & Mode Switch (GLIDE) */}
            <section className="mix-heading">
              <div>
                <h2>Your listening mix</h2>
                <p>
                  {generatedPrompt
                    ? `Recommendations for: “${generatedPrompt}”`
                    : `Selected for your current intent · ${tracks.length} recommendations`}
                </p>
              </div>
              <div className="mode-switch">
                <button
                  className={mode === 'familiar' ? 'selected' : ''}
                  onClick={() => setMode('familiar')}
                  title="Familiar Mode (MMR λ=1.0 - pure relevance)"
                >
                  Familiar
                </button>
                <button
                  className={mode === 'explore' ? 'selected' : ''}
                  onClick={() => setMode('explore')}
                  title="Explore Mode (GLIDE MMR λ=0.45 - non-habitual diversity)"
                >
                  Explore (GLIDE)
                </button>
              </div>
            </section>

            {/* Navigation Tabs */}
            <div className="tabs">
              {[
                ['tracks', 'Tracks'],
                ['why', 'Why these?'],
                ['signals', 'Preference signals']
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={tab === id ? 'active' : ''}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab: Tracks */}
            {tab === 'tracks' && (
              <>
                <div className="section-heading">
                  <h3>
                    {mode === 'explore'
                      ? 'GLIDE Non-Habitual Recommendations'
                      : 'Picked for this moment'}
                  </h3>
                  <span>
                    {mode === 'explore' ? 'DIVERSIFIED (λ=0.45)' : 'SORTED BY RELEVANCE (λ=1.0)'}
                  </span>
                </div>

                {loading ? (
                  <div className="track-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="skeleton-card">
                        <div className="skeleton-box" style={{ width: '100%', aspectRatio: '1' }} />
                        <div className="skeleton-box" style={{ width: '70%', height: '14px' }} />
                        <div className="skeleton-box" style={{ width: '40%', height: '10px' }} />
                        <div className="skeleton-box" style={{ width: '90%', height: '35px', marginTop: 'auto' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="track-grid">
                    {tracks.map(t => (
                      <TrackCard
                        key={t.id}
                        track={t}
                        saved={saved.includes(t.id)}
                        onPlay={() => playTrack(t)}
                        onSave={() => toggleSave(t)}
                        onSkip={() => skipTrack(t)}
                      />
                    ))}
                  </div>
                )}

                {mode !== 'explore' && (
                  <section className="explore-banner">
                    <div>
                      <b>A little outside your usual (GLIDE discovery)</b>
                      <p>Switch to GLIDE non-habitual listening to stretch your habits with curated diversity.</p>
                    </div>
                    <button className="outline-button" onClick={() => setMode('explore')}>
                      Explore more →
                    </button>
                  </section>
                )}
              </>
            )}

            {/* Tab: Why these? (LLM Grounded Reasoning & Intent) */}
            {tab === 'why' && (
              <section className="info-panel">
                <div className="eyebrow">SPOTIFY NEO EXPLANATION AGENT</div>
                <h2>From words to sound</h2>
                <p>
                  Your prompt is parsed by Google Gemini into high-dimensional audio constraints and a dense
                  semantic vector. FAISS matches tracks in continuous vector space, while RQ-KMeans generates
                  discrete Semantic IDs. Finally, the agent crafts grounded explanations for every song.
                </p>
                <div className="thin-divider" />
                <h3>Detected intent dimensions</h3>
                <div className="metrics">
                  {intentDimensions.map((item, idx) => (
                    <div className="metric" key={idx}>
                      <b>{item.label}</b>
                      <small>{item.sub}</small>
                    </div>
                  ))}
                </div>
                <div className="thin-divider" />
                <h3>Agent reasoning breakdown</h3>
                <p>{overallReasoning}</p>
              </section>
            )}

            {/* Tab: Preference Signals & DPO Flywheel */}
            {tab === 'signals' && (
              <section className="info-panel">
                <div className="eyebrow">PREFERENCE FLYWHEEL (RLHF / DPO)</div>
                <h2>Your feedback shapes the next mix.</h2>
                <p>
                  Every Save (+1.0), Skip (-1.0), and Play (+0.2) action updates your Tier 1 real-time taste
                  centroid. Accumulated sessions are mined into preference triplets (Prompt, Chosen, Rejected)
                  to fine-tune the model with Direct Preference Optimization.
                </p>

                <div className="metrics three">
                  {[
                    ['Saved', saved.length],
                    ['Skipped', skipped.length],
                    ['Played', played.length]
                  ].map(([label, count]) => (
                    <div className="metric" key={label}>
                      <b>{count}</b>
                      <small>{label}</small>
                    </div>
                  ))}
                </div>

                <div className="dpo-action-card">
                  <div>
                    <b>Direct Preference Optimization (DPO Flywheel)</b>
                    <p>Mines (Prompt, Chosen, Rejected) triplets from your feedback to align recommendations.</p>
                    {dpoResult && (
                      <span className="dpo-res-badge">
                        Status: {dpoResult.status} · Pairs: {dpoResult.pairs_trained || 0} ({dpoResult.mode})
                      </span>
                    )}
                  </div>
                  <button
                    className="dpo-button"
                    onClick={() => handleTrainDPO(true)}
                    disabled={dpoTraining}
                  >
                    {dpoTraining ? 'Aligning DPO...' : 'Run DPO Flywheel (Simulate)'}
                  </button>
                </div>

                <div className="thin-divider" />
                <h3>Recent preference signals</h3>
                {history.length ? (
                  <div className="history">
                    {history.map((h, i) => (
                      <div key={i}>{h}</div>
                    ))}
                  </div>
                ) : (
                  <p>No interactions yet. Save, play or skip a track to start building your taste profile.</p>
                )}
              </section>
            )}

            {/* Semantic Retrieval Snapshot Footer */}
            <section className="semantic-panel">
              <div className="semantic-head">
                <div>
                  <b>Semantic retrieval snapshot</b>
                  <small>Live telemetry · Spotify Tracks Catalog</small>
                </div>
                <span className="tag">RQ-KMEANS + FAISS</span>
              </div>
              <div className="semantic-grid">
                {[
                  ['INTENT ID', retrievalSnapshot.intent_id],
                  ['CATALOG ID', retrievalSnapshot.catalog_id],
                  ['RANKING MODE', retrievalSnapshot.ranking_mode],
                  ['RETRIEVAL', retrievalSnapshot.retrieval]
                ].map(([a, b]) => (
                  <div key={a}>
                    <small>{a}</small>
                    <strong>{b}</strong>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Persistent Bottom Player Bar */}
      <footer className="player-bar">
        <div className="now-playing">
          <img src={cover(current)} alt="Current track artwork" />
          <div>
            <b>{current.title}</b>
            <small>{current.artist}</small>
          </div>
          <button
            className={`heart ${saved.includes(current.id) ? 'liked' : ''}`}
            onClick={() => toggleSave(current)}
            aria-label="Save current track"
          >
            {saved.includes(current.id) ? '♥' : '♡'}
          </button>
        </div>
        <div className="player-center">
          <div className="player-controls">
            <button
              title="Shuffle"
              onClick={() => {
                if (tracks.length > 0) {
                  playTrack(tracks[Math.floor(Math.random() * tracks.length)]);
                }
              }}
            >
              ⤨
            </button>
            <button
              title="Previous"
              onClick={() => {
                if (tracks.length > 0) playTrack(tracks[0]);
              }}
            >
              ◂
            </button>
            <button
              className="play-button"
              onClick={() => setPlaying(!playing)}
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? 'Ⅱ' : '▶'}
            </button>
            <button
              title="Next"
              onClick={() => {
                if (tracks.length > 0) {
                  const idx = tracks.findIndex(t => t.id === current.id);
                  playTrack(tracks[(idx + 1 + tracks.length) % tracks.length]);
                }
              }}
            >
              ▸
            </button>
            <button title="Repeat" onClick={() => showToast('Repeat mode enabled')}>
              ↻
            </button>
          </div>
          <div className="timeline">
            <span>0:00</span>
            <div>
              <i style={{ width: playing ? '45%' : '20%' }} />
            </div>
            <span>{current.duration || '3:30'}</span>
          </div>
        </div>
        <div className="player-extra">
          <span>NOW PLAYING</span>
          <span>♫</span>
          <span>▰</span>
        </div>
      </footer>

      {/* Floating Status Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function TrackCard({ track, saved, onPlay, onSave, onSkip }) {
  return (
    <article className="track-card">
      <div className="artwork">
        <img src={cover(track)} alt={`${track.title} artwork`} loading="lazy" />
        <button className="art-play" onClick={onPlay} aria-label={`Play ${track.title}`}>
          ▶
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
