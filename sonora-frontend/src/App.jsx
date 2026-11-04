import React, { useMemo, useState, useEffect } from 'react';
import { useSonoraDiscovery } from './hooks/useSonoraDiscovery';
import {
  TrackCard,
  IntentBreakdown,
  SignalsPanel,
  PlayerBar,
  SemanticSnapshot
} from './components';

const FALLBACK_SEED_TRACK = {
  title: 'Tranquil Breath',
  artist: "Dustin O'Halloran",
  genre: 'Piano · Ambient',
  duration: '3:20',
  score: '98%',
  id: 'SID-11-00-12-13',
  semantic_id: 'SID-11-00-12-13',
  image: 'photo-1500530855697-b586d89ba3ee',
  image_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&h=600&q=85',
  preview_url: '/audio/ambient.wav',
  reason: 'Slow acoustic textures and minimal rhythmic movement create a focused study atmosphere.'
};

export default function App() {
  const {
    prompt,
    setPrompt,
    generatedPrompt,
    mode,
    setMode,
    enginePreference,
    setEngineMode,
    activeEngineInfo,
    webllmProgress,
    tracks,
    loading,
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
    // Real Audio state & controls
    playingTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    handlePlay,
    togglePlayPause,
    handleSeek,
    handleVolumeChange,
    handleToggleMute,
    handleToggleSave,
    handleSkip,
    handleTrainDPO
  } = useSonoraDiscovery('listener_01');

  const [tab, setTab] = useState('tracks');
  const [nav, setNav] = useState('Discover');
  const [toast, setToast] = useState('');

  // Determine currently selected track (either active playing track or top recommendation)
  const current = useMemo(() => {
    if (playingTrack) return playingTrack;
    if (tracks && tracks.length > 0) return tracks[0];
    return FALLBACK_SEED_TRACK;
  }, [playingTrack, tracks]);

  const showToast = message => {
    setToast(message);
    window.clearTimeout(window.__sonoraToast);
    window.__sonoraToast = window.setTimeout(() => setToast(''), 2400);
  };

  const playTrack = track => {
    handlePlay(track);
    showToast(`Streaming audio: ${track.title} · Sonora Player`);
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
    showToast('Consulting agent & FAISS index...');
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
            <div className="engine-control">
              {webllmProgress ? (
                <div className="progress-pill" title={webllmProgress.text}>
                  <div className="progress-bar-mini">
                    <span style={{ width: `${webllmProgress.progress}%` }} />
                  </div>
                  <span>{webllmProgress.progress}%</span>
                </div>
              ) : (
                <div className="status-pill">
                  <span className="status-dot" />
                  <span>{activeEngineInfo.label.toUpperCase()}</span>
                </div>
              )}
              <select
                className="engine-select"
                value={enginePreference}
                onChange={e => setEngineMode(e.target.value)}
                title="Select active language model inference engine"
              >
                <option value="auto">AUTO (HYBRID)</option>
                <option value="gemini">GEMINI 2.0 (CLOUD)</option>
                <option value="webllm">WEBLLM (OFFLINE WEBGPU)</option>
              </select>
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
                    isPlaying={isPlaying && current?.id === t.id}
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
                        isPlaying={isPlaying && current?.id === t.id}
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
              <IntentBreakdown
                activeEngineInfo={activeEngineInfo}
                intentDimensions={intentDimensions}
                overallReasoning={overallReasoning}
              />
            )}

            {/* Tab: Preference Signals & DPO Flywheel */}
            {tab === 'signals' && (
              <SignalsPanel
                saved={saved}
                skipped={skipped}
                played={played}
                history={history}
                dpoTraining={dpoTraining}
                dpoResult={dpoResult}
                onTrainDPO={handleTrainDPO}
              />
            )}

            {/* Semantic Retrieval Snapshot Footer */}
            <SemanticSnapshot retrievalSnapshot={retrievalSnapshot} />
          </>
        )}
      </main>

      {/* Persistent Bottom Player Bar with Real HTML5 Audio Streaming */}
      <PlayerBar
        current={current}
        playing={isPlaying}
        saved={saved}
        tracks={tracks}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        onTogglePlay={togglePlayPause}
        onToggleSave={toggleSave}
        onPlayTrack={playTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onShowToast={showToast}
      />

      {/* Floating Status Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
