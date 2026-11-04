import React from 'react';
import {
  LogoMark,
  CompassIcon,
  LibraryIcon,
  HeartIcon,
  CloseIcon
} from './icons';

export interface NavItem {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  currentNav: string;
  onSelectNav: (name: string) => void;
  savedCount?: number;
  playedCount?: number;
  skippedCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

const COLLECTIONS = ['Late Night Focus', 'Quiet Mornings', 'Beyond Your Usual'];

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onSelectNav,
  savedCount = 0,
  playedCount = 0,
  skippedCount = 0,
  isOpenMobile = false,
  onCloseMobile,
  className = ''
}) => {
  const totalSignals = savedCount + playedCount + skippedCount;
  const profileProgress = Math.min(100, Math.max(25, (savedCount + playedCount) * 15));
  const isProfileCalibrated = savedCount > 2 || totalSignals > 6;

  const navItems: NavItem[] = [
    { id: 'Discover', name: 'Discover', icon: <CompassIcon size={17} /> },
    { id: 'Your Library', name: 'Your Library', icon: <LibraryIcon size={17} /> },
    { id: 'Saved Tracks', name: 'Saved Tracks', icon: <HeartIcon size={17} /> }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#101013] border-r border-white/[0.06] flex flex-col justify-between p-5 select-none transition-transform duration-200 ease-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } ${className}`}
        aria-label="Application Navigation Sidebar"
      >
        {/* Top Section: Brand + Workspace Navigation */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Brand Row */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <LogoMark size={28} />
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-[0.2em] text-white">SONORA</span>
                <span className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">
                  Music Discovery
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close menu"
                className="p-1 rounded-lg text-zinc-400 hover:text-white md:hidden"
              >
                <CloseIcon size={18} />
              </button>
            )}
          </div>

          {/* Workspace Nav */}
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase px-2 mb-2">
              Workspace
            </div>
            <nav className="space-y-1" aria-label="Main Navigation">
              {navItems.map(item => {
                const isActive = currentNav === item.name;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectNav(item.name);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F26B]/50 ${
                      isActive
                        ? 'bg-white/[0.08] text-white shadow-sm font-semibold'
                        : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-zinc-400'}>{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Collections */}
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase px-2 mb-2">
              Your Collections
            </div>
            <div className="space-y-1">
              {COLLECTIONS.map(coll => {
                const isActive = currentNav === coll;

                return (
                  <button
                    key={coll}
                    type="button"
                    onClick={() => {
                      onSelectNav(coll);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors duration-150 ${
                      isActive
                        ? 'bg-white/[0.06] text-white font-medium'
                        : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    {coll}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Section: Simplified Taste Profile Card + User Profile */}
        <div className="pt-4 border-t border-white/[0.06] space-y-4">
          {/* Taste Profile Card (Problem 6 Fix: Clean, uncompeting design) */}
          <div className="p-3.5 rounded-xl bg-[#161619] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Taste Profile
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
                {isProfileCalibrated ? 'Calibrated' : 'Evolving'}
              </span>
            </div>

            {/* Subtle Progress Bar */}
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-zinc-400 rounded-full transition-all duration-300"
                style={{ width: `${profileProgress}%` }}
              />
            </div>

            <p className="text-[11px] text-zinc-400">
              {totalSignals > 0 ? `${totalSignals} preference signals tracked` : 'Adapts as you listen & save'}
            </p>
          </div>

          {/* User Row */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/[0.1] text-zinc-200 font-semibold text-xs flex items-center justify-center">
              L
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">Listener 01</div>
              <div className="text-[10px] text-zinc-400 truncate">Personalized Flywheel</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
