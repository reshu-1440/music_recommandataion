import React from 'react';
import { MenuIcon, CpuIcon, ChevronDownIcon } from './icons';

interface HeaderProps {
  currentNav: string;
  activeEngineInfo?: {
    engine?: string;
    label?: string;
    fallbackReason?: string | null;
  };
  enginePreference: string;
  onEngineChange: (value: string) => void;
  webllmProgress?: { progress: number; text: string } | null;
  onOpenTelemetry?: () => void;
  onOpenMobileMenu?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentNav,
  activeEngineInfo,
  enginePreference,
  onEngineChange,
  webllmProgress,
  onOpenTelemetry,
  onOpenMobileMenu,
  className = ''
}) => {
  return (
    <header
      className={`h-16 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-8 border-b border-white/[0.06] bg-[#0B0B0C]/80 backdrop-blur-md select-none sticky top-0 z-30 ${className}`}
    >
      {/* Left: Mobile hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white md:hidden focus-visible:outline-none"
          >
            <MenuIcon size={20} />
          </button>
        )}

        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span className="hidden sm:inline hover:text-zinc-300 transition-colors">
            Language Discovery
          </span>
          <span className="hidden sm:inline text-zinc-600">/</span>
          <span className="text-white font-semibold">{currentNav}</span>
        </div>
      </div>

      {/* Right: Telemetry pill, engine dropdown, and avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* WebLLM Downloading Progress (if active) */}
        {webllmProgress ? (
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium"
            title={webllmProgress.text}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>WebGPU {webllmProgress.progress}%</span>
          </div>
        ) : (
          /* Streamlined Engine Telemetry Pill (Fix for Problem 2 & 6: Clean, non-distracting) */
          <button
            type="button"
            onClick={onOpenTelemetry}
            title="Click to view engine architecture & vector telemetry"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6F26B]" />
            <span className="hidden lg:inline text-zinc-400 font-normal">Engine:</span>
            <span>{activeEngineInfo?.engine === 'gemini' ? 'Gemini 2.0' : activeEngineInfo?.engine === 'webllm' ? 'WebLLM Local' : 'Hybrid AI'}</span>
            <CpuIcon size={14} className="text-zinc-500 ml-0.5" />
          </button>
        )}

        {/* Engine Preference Dropdown */}
        <div className="relative inline-block">
          <select
            value={enginePreference}
            onChange={e => onEngineChange(e.target.value)}
            aria-label="Select active inference model"
            title="Inference Engine Routing"
            className="appearance-none bg-[#161619] hover:bg-[#1E1E23] border border-white/[0.08] text-zinc-300 text-xs font-medium rounded-xl pl-3 pr-8 py-1.5 cursor-pointer outline-none transition-colors focus:border-white/20"
          >
            <option value="auto">Auto (Hybrid)</option>
            <option value="gemini">Gemini 2.0 (Cloud)</option>
            <option value="webllm">WebLLM (WebGPU)</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
            <ChevronDownIcon size={12} />
          </div>
        </div>

        {/* User Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-zinc-800 border border-white/[0.1] text-zinc-200 font-semibold text-xs flex items-center justify-center shrink-0 cursor-pointer hover:border-white/20 transition-colors"
          title="Listener 01 Profile"
        >
          L
        </div>
      </div>
    </header>
  );
};

export default Header;
