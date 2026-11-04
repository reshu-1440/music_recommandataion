import React from 'react';
import { MOOD_PRESETS, MoodPreset } from './MoodChips';
import { SparklesIcon } from './icons';

interface InvalidMoodNoticeProps {
  query: string;
  errorMessage?: string;
  onSelectPreset: (preset: MoodPreset) => void;
  className?: string;
}

export const InvalidMoodNotice: React.FC<InvalidMoodNoticeProps> = ({
  query,
  errorMessage,
  onSelectPreset,
  className = ''
}) => {
  const displayMsg =
    errorMessage ||
    "We couldn't detect a music mood, vibe, genre, or listening context from your input.";

  return (
    <div
      className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#1C1A14] to-[#141417] border border-amber-500/30 shadow-[0_8px_32px_rgba(245,158,11,0.08)] ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Invalid Listening Mood
            </span>
            <span className="text-xs text-zinc-500 hidden sm:inline">Edge Case Detected</span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
            Please enter a valid listening mood
          </h3>

          <p className="text-sm text-zinc-300 mb-2 leading-relaxed">
            {displayMsg}
          </p>

          {query && (
            <p className="text-xs text-zinc-400 mb-5 font-mono bg-black/40 px-3 py-1.5 rounded-lg inline-block border border-white/[0.06]">
              Received input: <span className="text-amber-300 font-semibold">“{query}”</span>
            </p>
          )}

          <div className="pt-4 border-t border-white/[0.08]">
            <div className="text-xs font-medium text-zinc-400 mb-2.5 flex items-center gap-1.5">
              <SparklesIcon size={14} className="text-[#C6F26B]" />
              <span>Try one of these quick moods to get instant music recommendations:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {MOOD_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#1F2024] text-zinc-200 border border-white/[0.12] hover:bg-[#C6F26B] hover:text-[#0B0B0C] hover:border-[#C6F26B] transition-all duration-150 active:scale-95 shadow-sm"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvalidMoodNotice;
