import React from 'react';
import { SparklesIcon } from './icons';

interface IntentBreakdownProps {
  activeEngineInfo?: {
    engine?: string;
    label?: string;
  };
  intentDimensions?: Array<{ label: string; sub: string }>;
  overallReasoning?: string;
  className?: string;
}

export const IntentBreakdown: React.FC<IntentBreakdownProps> = ({
  activeEngineInfo,
  intentDimensions = [],
  overallReasoning,
  className = ''
}) => {
  return (
    <section className={`p-6 sm:p-8 rounded-2xl bg-[#141417] border border-white/[0.08] shadow-lg space-y-6 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 tracking-wider uppercase">
        <SparklesIcon size={16} />
        <span>{(activeEngineInfo?.label || 'Hybrid Semantic').toUpperCase()} EXPLANATION AGENT</span>
      </div>

      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          From words to sound
        </h3>
        <p className="text-sm text-zinc-300 leading-relaxed mt-2 max-w-2xl">
          Your prompt is decomposed into acoustic constraints and a continuous semantic vector. FAISS matches candidate songs in cosine embedding space, while residual quantization clusters track fingerprints. Finally, grounded explanations are synthesized for every track.
        </p>
      </div>

      <div className="h-px bg-white/[0.06]" />

      <div>
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Detected Intent Dimensions
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {intentDimensions.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#18181D] border border-white/[0.06]">
              <span className="text-sm font-semibold text-white block mb-1">{item.label}</span>
              <span className="text-xs text-zinc-400 block">{item.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/[0.06]" />

      <div>
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Model Reasoning Synthesis
        </h4>
        <p className="text-sm text-zinc-300 leading-relaxed bg-[#18181D] p-4 rounded-xl border border-white/[0.06]">
          {overallReasoning || 'Acoustic piano and atmospheric textures selected for deep focus and study.'}
        </p>
      </div>
    </section>
  );
};

export default IntentBreakdown;
