import React, { useMemo, useState } from 'react';
import { useSonoraDiscovery } from './hooks/useSonoraDiscovery';
import { Track, SEED_PLAYER_TRACK, MoodPreset } from './data/mockTracks';
import {
  AppShell,
  Hero,
  MoodSearch,
  ResultsHeader,
  ResultTabs,
  TabId,
  TrackGrid,
  DiscoveryBanner,
  SemanticSnapshot,
  IntentBreakdown,
  SignalsPanel,
  InvalidMoodNotice
} from './components';

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
    validationError,
    isInvalidMood,
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

  const [tab, setTab] = useState<TabId>('tracks');
  const [nav, setNav] = useState<string>('Discover');
  const [toast, setToast] = useState<string>('');
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState<boolean>(false);
  const [selectedInspectTrack, setSelectedInspectTrack] = useState<Track | null>(null);

  // Active track selected for player
  const currentTrack: Track = useMemo(() => {
    if (playingTrack) return playingTrack;
    if (tracks && tracks.length > 0) return tracks[0];
    return SEED_PLAYER_TRACK;
  }, [playingTrack, tracks]);

  const showToast = (message: string) => {
    setToast(message);
    // @ts-ignore
    window.clearTimeout(window.__sonoraToast);
    // @ts-ignore
    window.__sonoraToast = window.setTimeout(() => setToast(''), 2400);
  };

  const playTrack = (track: Track) => {
    handlePlay(track);
    showToast(`Playing preview: ${track.title} · ${track.artist}`);
  };

  const toggleSave = async (track: Track) => {
    const res = await handleToggleSave(track);
    showToast(res.saved ? `Saved “${track.title}” to your library` : `Removed “${track.title}” from library`);
  };

  const skipTrack = (track: Track) => {
    handleSkip(track);
    showToast(`Feedback noted: Skipped “${track.title}”`);
  };

  const handleInspectTrack = (track: Track) => {
    setSelectedInspectTrack(track);
    setIsDetailsDrawerOpen(true);
  };

  const handleSearchSubmit = async () => {
    if (!prompt.trim()) {
      showToast('Please describe your listening mood first');
      return;
    }
    const nextMode = /new|different|unexpected|explore|unusual|stretch/i.test(prompt) ? 'explore' : mode;
    showToast('Consulting semantic engine & FAISS vectors...');
    const res = await discover(prompt, nextMode);
    if (res && res.success) {
      showToast(`Synthesized ${res.count} recommendations via Semantic Vectors`);
    } else if (res && res.error) {
      showToast(`Notice: ${res.error}`);
    }
    setTab('tracks');
    setNav('Discover');
  };

  const handleChipSelect = (preset: MoodPreset) => {
    setPrompt(preset.prompt);
    discover(preset.prompt, mode);
  };

  const selectNav = (name: string) => {
    setNav(name);
    if (name === 'Discover') {
      setTab('tracks');
      return;
    }
    if (name === 'Saved Tracks' || name === 'Your Library') {
      setTab('library');
    } else {
      showToast(`${name} · Collection filter`);
    }
  };

  const visibleSaved = useMemo(() => {
    return tracks.filter(t => saved.includes(t.id));
  }, [tracks, saved]);

  return (
    <AppShell
      currentNav={nav}
      onSelectNav={selectNav}
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      saved={saved}
      skipped={skipped}
      played={played}
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
      activeEngineInfo={activeEngineInfo}
      enginePreference={enginePreference}
      onEngineChange={setEngineMode}
      webllmProgress={webllmProgress}
      retrievalSnapshot={retrievalSnapshot}
      mode={mode}
      selectedInspectTrack={selectedInspectTrack}
      isDetailsDrawerOpen={isDetailsDrawerOpen}
      onOpenDetailsDrawer={() => setIsDetailsDrawerOpen(true)}
      onCloseDetailsDrawer={() => setIsDetailsDrawerOpen(false)}
      toastMessage={toast}
    >
      {nav === 'Saved Tracks' || nav === 'Your Library' ? (
        /* Library & Saved Tracks View */
        <section className="py-2">
          <div className="mb-6">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block mb-1">
              Your Music
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{nav}</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Curated tracks preserved from your discovery sessions.
            </p>
          </div>

          <TrackGrid
            tracks={visibleSaved}
            saved={saved}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlayTrack={playTrack}
            onToggleSave={toggleSave}
            onSkipTrack={skipTrack}
            onInspectTrack={handleInspectTrack}
            emptyMessage="No saved tracks yet. Click the heart icon on any song to save it to your library."
          />
        </section>
      ) : (
        /* Main Discover View */
        <>
          {/* Hero Section */}
          <Hero />

          {/* Centerpiece Natural Language Mood Search Panel */}
          <MoodSearch
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={handleSearchSubmit}
            onChipSelect={handleChipSelect}
            loading={loading}
            validationError={validationError}
            className="mb-8"
          />

          {/* Invalid Mood Alert Notice when an edge-case or random input is submitted */}
          {isInvalidMood && (
            <InvalidMoodNotice
              query={generatedPrompt || prompt}
              errorMessage={validationError || undefined}
              onSelectPreset={handleChipSelect}
              className="mb-8"
            />
          )}

          {/* Results Heading & Mode Switch (GLIDE) */}
          <ResultsHeader
            query={isInvalidMood ? undefined : generatedPrompt}
            count={tracks.length}
            mode={mode}
            onModeChange={setMode}
          />

          {/* Underline Tabs */}
          <ResultTabs activeTab={tab} onTabChange={setTab} />

          {/* Tab 1: Tracks Grid */}
          {tab === 'tracks' && (
            <>
              {!isInvalidMood && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    {mode === 'explore'
                      ? 'GLIDE Non-Habitual Recommendations'
                      : 'Picked for this moment'}
                  </h3>
                  <span className="text-xs font-medium text-zinc-400">
                    {mode === 'explore' ? 'Diversified Discovery' : 'Sorted by Relevance'}
                  </span>
                </div>
              )}

              <TrackGrid
                tracks={tracks}
                loading={loading}
                saved={saved}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={playTrack}
                onToggleSave={toggleSave}
                onSkipTrack={skipTrack}
                onInspectTrack={handleInspectTrack}
                emptyMessage={
                  isInvalidMood
                    ? "Please enter a valid listening mood, activity, or genre above to discover music."
                    : "No tracks found for this mood query. Try a different prompt!"
                }
              />

              {!isInvalidMood && mode !== 'explore' && (
                <DiscoveryBanner onExplore={() => setMode('explore')} />
              )}
            </>
          )}

          {/* Tab 2: Why these? (Model Reasoning & Intent Breakdown) */}
          {tab === 'why' && (
            <IntentBreakdown
              activeEngineInfo={activeEngineInfo}
              intentDimensions={intentDimensions}
              overallReasoning={overallReasoning}
            />
          )}

          {/* Tab 3: Preference signals (DPO Flywheel) */}
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

          {/* Semantic Retrieval Snapshot Footer Card with Telemetry Drawer Trigger */}
          <SemanticSnapshot
            retrievalSnapshot={retrievalSnapshot}
            onOpenDetails={() => setIsDetailsDrawerOpen(true)}
          />
        </>
      )}
    </AppShell>
  );
}
