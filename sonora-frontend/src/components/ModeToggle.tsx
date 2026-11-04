import React from 'react';

interface ModeToggleProps {
  mode: 'familiar' | 'explore';
  onChange: (mode: 'familiar' | 'explore') => void;
  className?: string;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange, className = '' }) => {
  const isExplore = mode === 'explore';

  return (
    <div
      role="radiogroup"
      aria-label="Recommendation diversity mode"
      className={`relative inline-flex items-center p-1 rounded-xl bg-[#141417] border border-white/[0.08] select-none ${className}`}
    >
      {/* Sliding indicator */}
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-[#222226] border border-white/[0.1] shadow-sm transition-all duration-200 ease-out pointer-events-none"
        style={{
          left: isExplore ? 'calc(50% + 2px)' : '4px',
          width: 'calc(50% - 6px)'
        }}
      />

      <button
        type="button"
        role="radio"
        aria-checked={!isExplore}
        onClick={() => onChange('familiar')}
        className={`relative z-10 flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-colors duration-150 text-center bg-transparent ${
          !isExplore ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
        }`}
        title="Familiar Mode: Matches your established listening taste directly"
      >
        Familiar
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={isExplore}
        onClick={() => onChange('explore')}
        className={`relative z-10 flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-colors duration-150 text-center flex items-center justify-center gap-1.5 bg-transparent ${
          isExplore ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
        }`}
        title="Explore Mode: Non-habitual diversity via GLIDE algorithm"
      >
        <span>Explore</span>
        <span className="text-[10px] tracking-wider px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300">
          GLIDE
        </span>
      </button>
    </div>
  );
};

export default ModeToggle;
