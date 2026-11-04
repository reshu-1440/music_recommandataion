import React from 'react';
import { ArrowRightIcon, SparklesIcon } from './icons';

interface DiscoveryBannerProps {
  onExplore: () => void;
  className?: string;
}

export const DiscoveryBanner: React.FC<DiscoveryBannerProps> = ({ onExplore, className = '' }) => {
  return (
    <section
      className={`mt-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#141417] via-[#17171C] to-[#141417] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-300 shrink-0">
          <SparklesIcon size={20} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white tracking-tight">
            A little outside your usual <span className="text-zinc-400 font-normal">(GLIDE Discovery)</span>
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
            Switch to GLIDE non-habitual listening to stretch your taste with curated serendipity and continuous vector novelty.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onExplore}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] active:scale-[0.98] transition-all whitespace-nowrap self-start sm:self-auto"
      >
        <span>Explore more</span>
        <ArrowRightIcon size={13} />
      </button>
    </section>
  );
};

export default DiscoveryBanner;
