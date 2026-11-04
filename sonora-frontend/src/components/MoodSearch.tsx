import React, { useRef, useEffect } from 'react';
import { MoodChips, MoodPreset } from './MoodChips';
import { ArrowRightIcon, SparklesIcon } from './icons';

interface MoodSearchProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: () => void;
  onChipSelect: (preset: MoodPreset) => void;
  loading?: boolean;
  className?: string;
}

export const MoodSearch: React.FC<MoodSearchProps> = ({
  prompt,
  setPrompt,
  onSubmit,
  onChipSelect,
  loading = false,
  className = ''
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <section
      className={`relative p-5 sm:p-7 rounded-2xl bg-[#141417] border border-white/[0.08] shadow-lg transition-all duration-200 focus-within:border-white/[0.2] focus-within:shadow-[0_8px_32px_rgba(0,0,0,0.6)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <label htmlFor="mood-prompt" className="text-sm font-semibold text-white flex items-center gap-2">
          <span>Describe your listening mood</span>
        </label>
        <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase hidden sm:inline-block">
          Natural Language Engine
        </span>
      </div>

      <div className="relative mb-5">
        <textarea
          ref={textareaRef}
          id="mood-prompt"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Dreamy sunset by the beach, warm synth pads with slow lo-fi drums..."
          rows={3}
          className="w-full p-4 rounded-xl bg-[#1A1A1E] border border-white/[0.08] text-white text-sm sm:text-base placeholder-zinc-500 resize-none transition-all duration-150 outline-none focus:border-[#C6F26B]/50 focus:ring-2 focus:ring-[#C6F26B]/20"
        />
        <div className="absolute right-3 bottom-3 text-[11px] text-zinc-500 pointer-events-none hidden md:block">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-400 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-400 font-mono text-[10px]">Enter</kbd>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1 border-t border-white/[0.06]">
        <div className="flex-1">
          <div className="text-[11px] text-zinc-400 font-medium mb-2 uppercase tracking-wider">
            Quick Prompts:
          </div>
          <MoodChips currentPrompt={prompt} onSelect={onChipSelect} />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !prompt.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold text-[#0B0B0C] bg-[#C6F26B] hover:bg-[#D4FA7E] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(198,242,107,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#C6F26B]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                <span>Finding sound...</span>
              </>
            ) : (
              <>
                <SparklesIcon size={16} />
                <span>Find my sound</span>
                <ArrowRightIcon size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default MoodSearch;
