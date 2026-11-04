import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PlayerBar } from './PlayerBar';
import { DetailsDrawer } from './DetailsDrawer';
import { Track } from '../data/mockTracks';

interface AppShellProps {
  currentNav: string;
  onSelectNav: (nav: string) => void;
  // Audio state & controls
  currentTrack: Track | null;
  isPlaying: boolean;
  saved: string[];
  skipped: string[];
  played: string[];
  tracks: Track[];
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onToggleSave: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onShowToast: (msg: string) => void;
  // Engine & telemetry state
  activeEngineInfo?: { engine?: string; label?: string; fallbackReason?: string | null };
  enginePreference: string;
  onEngineChange: (pref: string) => void;
  webllmProgress?: { progress: number; text: string } | null;
  retrievalSnapshot?: any;
  mode?: 'familiar' | 'explore';
  selectedInspectTrack?: Track | null;
  isDetailsDrawerOpen: boolean;
  onOpenDetailsDrawer: () => void;
  onCloseDetailsDrawer: () => void;
  toastMessage?: string;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentNav,
  onSelectNav,
  currentTrack,
  isPlaying,
  saved,
  skipped,
  played,
  tracks,
  currentTime,
  duration,
  volume,
  isMuted,
  onTogglePlay,
  onToggleSave,
  onPlayTrack,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onShowToast,
  activeEngineInfo,
  enginePreference,
  onEngineChange,
  webllmProgress,
  retrievalSnapshot,
  mode = 'familiar',
  selectedInspectTrack,
  isDetailsDrawerOpen,
  onOpenDetailsDrawer,
  onCloseDetailsDrawer,
  toastMessage,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-[#0B0B0C] text-white flex overflow-hidden font-sans antialiased">
      {/* Sidebar navigation */}
      <Sidebar
        currentNav={currentNav}
        onSelectNav={onSelectNav}
        savedCount={saved.length}
        playedCount={played.length}
        skippedCount={skipped.length}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <Header
          currentNav={currentNav}
          activeEngineInfo={activeEngineInfo}
          enginePreference={enginePreference}
          onEngineChange={onEngineChange}
          webllmProgress={webllmProgress}
          onOpenTelemetry={onOpenDetailsDrawer}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Scrollable Main Viewport (Accounting for Player Bar Height with pb-36) */}
        <main
          id="main-scrollable-content"
          className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 pt-6 pb-36 scroll-smooth focus:outline-none"
          tabIndex={-1}
        >
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Persistent Bottom Player Bar */}
        <PlayerBar
          current={currentTrack}
          playing={isPlaying}
          saved={saved}
          tracks={tracks}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          onTogglePlay={onTogglePlay}
          onToggleSave={onToggleSave}
          onPlayTrack={onPlayTrack}
          onSeek={onSeek}
          onVolumeChange={onVolumeChange}
          onToggleMute={onToggleMute}
          onShowToast={onShowToast}
          onOpenTelemetry={onOpenDetailsDrawer}
        />

        {/* Slide-over Details Drawer */}
        <DetailsDrawer
          isOpen={isDetailsDrawerOpen}
          onClose={onCloseDetailsDrawer}
          retrievalSnapshot={retrievalSnapshot}
          activeEngineInfo={activeEngineInfo}
          selectedTrack={selectedInspectTrack || currentTrack}
          mode={mode}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <aside
            role="status"
            aria-live="polite"
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#18181D] text-white text-xs font-semibold border border-white/[0.12] shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6F26B]" />
            <span>{toastMessage}</span>
          </aside>
        )}
      </div>
    </div>
  );
};

export default AppShell;
