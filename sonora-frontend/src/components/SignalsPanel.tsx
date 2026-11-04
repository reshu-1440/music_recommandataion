import React from 'react';
import { SparklesIcon } from './icons';

interface SignalsPanelProps {
  saved?: string[];
  skipped?: string[];
  played?: string[];
  history?: string[];
  dpoTraining?: boolean;
  dpoResult?: any;
  onTrainDPO?: (dryRun?: boolean) => void;
  className?: string;
}

export const SignalsPanel: React.FC<SignalsPanelProps> = ({
  saved = [],
  skipped = [],
  played = [],
  history = [],
  dpoTraining = false,
  dpoResult = null,
  onTrainDPO,
  className = ''
}) => {
  return (
    <section className={`p-6 sm:p-8 rounded-2xl bg-[#141417] border border-white/[0.08] shadow-lg space-y-6 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 tracking-wider uppercase">
        <SparklesIcon size={16} />
        <span>Preference Flywheel (RLHF / DPO Alignment)</span>
      </div>

      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Your feedback shapes your next mix
        </h3>
        <p className="text-sm text-zinc-300 leading-relaxed mt-2 max-w-2xl">
          Every Save (+1.0), Skip (-1.0), and Play (+0.2) action updates your taste vector in real-time. Accumulated sessions are mined into preference triplets (Prompt, Chosen, Rejected) to continuously steer the recommendation model.
        </p>
      </div>

      {/* Signal Counters Grid */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          ['Saved Tracks', saved.length, 'Positive affinity (+1.0)'],
          ['Skipped Tracks', skipped.length, 'Negative affinity (-1.0)'],
          ['Audio Previews', played.length, 'Passive engagement (+0.2)']
        ].map(([label, count, desc]) => (
          <div key={label as string} className="p-4 rounded-xl bg-[#18181D] border border-white/[0.06]">
            <span className="text-2xl sm:text-3xl font-bold text-white block mb-0.5">{count}</span>
            <span className="text-xs font-semibold text-zinc-300 block">{label}</span>
            <span className="text-[11px] text-zinc-500 mt-1 block hidden sm:block">{desc}</span>
          </div>
        ))}
      </div>

      {/* DPO Flywheel Action Card */}
      <div className="p-5 rounded-xl bg-[#18181D] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-white">Direct Preference Optimization (DPO)</h4>
          <p className="text-xs text-zinc-400 mt-1 max-w-lg">
            Mines chosen vs rejected track pairs from your session to align the loss function.
          </p>
          {dpoResult && (
            <div className="mt-2.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.06] text-xs font-mono text-zinc-300">
              <span>Status: {dpoResult.status}</span>
              <span>·</span>
              <span>Pairs: {dpoResult.pairs_trained || 0}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onTrainDPO && onTrainDPO(true)}
          disabled={dpoTraining}
          className="px-4 py-2.5 rounded-full text-xs font-semibold text-white bg-white/[0.1] hover:bg-white/[0.16] border border-white/[0.1] transition-all whitespace-nowrap disabled:opacity-50 self-start sm:self-auto"
        >
          {dpoTraining ? 'Aligning DPO...' : 'Run DPO Flywheel (Simulate)'}
        </button>
      </div>

      <div className="h-px bg-white/[0.06]" />

      {/* History Log */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Recent Interaction Log
        </h4>
        {history.length > 0 ? (
          <div className="space-y-1.5 font-mono text-xs text-zinc-400">
            {history.map((h, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-[#18181D]/60 border border-white/[0.04]">
                {h}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">
            No signals registered yet. Save, play or skip a track to start tailoring your profile.
          </p>
        )}
      </div>
    </section>
  );
};

export default SignalsPanel;
