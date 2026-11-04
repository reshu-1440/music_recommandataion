import React from 'react';

export interface MoodPreset {
  label: string;
  prompt: string;
  icon?: string;
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    label: 'Late Night 3 AM',
    prompt: 'Something calm for a 3 a.m. study session, with soft vocals and no distracting beats'
  },
  {
    label: 'Deep focus',
    prompt: 'Instrumental music for deep focus, minimal acoustic piano and atmospheric textures'
  },
  {
    label: 'Heavy workout',
    prompt: 'High energy driving electronic beats with aggressive rhythm for gym training'
  },
  {
    label: 'Rainy Sunday',
    prompt: 'Music for a rainy Sunday morning, warm acoustic strings and nostalgic feel'
  }
];

interface MoodChipsProps {
  currentPrompt: string;
  onSelect: (preset: MoodPreset) => void;
  className?: string;
}

export const MoodChips: React.FC<MoodChipsProps> = ({ currentPrompt, onSelect, className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} role="group" aria-label="Quick mood shortcuts">
      {MOOD_PRESETS.map(preset => {
        const isActive = currentPrompt.trim().toLowerCase() === preset.prompt.trim().toLowerCase();

        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => onSelect(preset)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F26B]/60 ${
              isActive
                ? 'bg-white/[0.14] text-white border-white/[0.28] shadow-sm'
                : 'bg-[#18181B] text-zinc-300 border-white/[0.08] hover:bg-[#222226] hover:text-white hover:border-white/[0.16]'
            }`}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
};

export default MoodChips;
