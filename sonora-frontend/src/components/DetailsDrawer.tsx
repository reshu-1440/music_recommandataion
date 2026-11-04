import React, { useEffect } from 'react';
import { Track } from '../data/mockTracks';
import { CloseIcon, CpuIcon, SparklesIcon } from './icons';

interface DetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  retrievalSnapshot?: {
    intent_id?: string;
    catalog_id?: string;
    ranking_mode?: string;
    retrieval?: string;
    latency_ms?: number;
    vector_dimension?: number;
    rq_codebooks?: number;
  };
  activeEngineInfo?: {
    engine?: string;
    label?: string;
    fallbackReason?: string | null;
  };
  selectedTrack?: Track | null;
  mode?: 'familiar' | 'explore';
  className?: string;
}

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  isOpen,
  onClose,
  retrievalSnapshot,
  activeEngineInfo,
  selectedTrack,
  mode = 'familiar',
  className = ''
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const snapshot = retrievalSnapshot || {
    intent_id: 'INT-BAL-8',
    catalog_id: 'CAT-800',
    ranking_mode: 'Hybrid (Semantic + Preference)',
    retrieval: 'FAISS IndexFlatIP (Cosine) + Gemini Reasoning',
    latency_ms: 38,
    vector_dimension: 768,
    rq_codebooks: 4
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Engine and Vector Telemetry Drawer"
        className={`relative z-10 w-full max-w-lg bg-[#121215] border-l border-white/[0.08] shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-out ${className}`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-zinc-300">
              <CpuIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Engine & Vector Telemetry
              </h3>
              <p className="text-xs text-zinc-400">
                Low-level algorithmic internals & semantic IDs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details drawer"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Model Engine Badge */}
          <div className="p-4 rounded-xl bg-[#18181D] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Inference Engine
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#C6F26B]/10 text-[#C6F26B] border border-[#C6F26B]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6F26B]" />
                {activeEngineInfo?.label || 'Auto (Fast Semantic)'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Coordinates query intent embedding extraction with Google Gemini and local semantic projection.
            </p>
          </div>

          {/* Retrieval Architecture Grid */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Discrete Semantic Indexing
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#18181D] border border-white/[0.06]">
                <span className="text-[10px] text-zinc-500 font-mono block mb-1">INTENT ID</span>
                <span className="text-xs font-mono font-medium text-white block">
                  {snapshot.intent_id || 'INT-BAL-8'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#18181D] border border-white/[0.06]">
                <span className="text-[10px] text-zinc-500 font-mono block mb-1">CATALOG REPO</span>
                <span className="text-xs font-mono font-medium text-white block">
                  {snapshot.catalog_id || 'CAT-800'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#18181D] border border-white/[0.06]">
                <span className="text-[10px] text-zinc-500 font-mono block mb-1">RANKING MODE</span>
                <span className="text-xs font-medium text-white block">
                  {snapshot.ranking_mode || 'Hybrid (Semantic + Pref)'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#18181D] border border-white/[0.06]">
                <span className="text-[10px] text-zinc-500 font-mono block mb-1">DIVERSITY FACTOR</span>
                <span className="text-xs font-mono font-medium text-white block">
                  {mode === 'explore' ? 'GLIDE λ=0.45' : 'MMR λ=1.0'}
                </span>
              </div>
            </div>
          </div>

          {/* Vector Retrieval Stack */}
          <div className="p-4 rounded-xl bg-[#18181D] border border-white/[0.06]">
            <span className="text-[10px] text-zinc-500 font-mono block mb-1">VECTOR PIPELINE</span>
            <span className="text-xs font-mono text-zinc-200 block mb-2">
              {snapshot.retrieval || 'FAISS IndexFlatIP (Cosine) + Gemini Reasoning'}
            </span>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.06]">
                RQ-KMEANS (8 Codebooks)
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.06]">
                Dense Cosine (768d)
              </span>
            </div>
          </div>

          {/* Track Fingerprint Inspection (if a track is selected or top track) */}
          {selectedTrack && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Selected Track Fingerprint
              </h4>
              <div className="p-4 rounded-xl bg-[#18181D] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedTrack.image_url}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <h5 className="text-sm font-semibold text-white">{selectedTrack.title}</h5>
                    <p className="text-xs text-zinc-400">{selectedTrack.artist}</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
                  <span className="text-[10px] text-zinc-500 font-mono block mb-0.5">
                    SEMANTIC CODEBOOK ID
                  </span>
                  <code className="text-xs font-mono text-[#C6F26B]">
                    {selectedTrack.semantic_id || selectedTrack.id}
                  </code>
                </div>

                {selectedTrack.technical_reason && (
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono block mb-1">
                      GROUNDED EXPLANATION
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                      {selectedTrack.technical_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plain-Language Mapping Helper */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <h5 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
              <SparklesIcon size={14} className="text-[#C6F26B]" />
              <span>How SONORA Works</span>
            </h5>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Instead of relying strictly on artist genre tags or keyword matching, SONORA encodes music into high-dimensional semantic spaces and hierarchical RQ-KMeans codes. This allows finding songs that feel exactly right even across distinct genres.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0E0E11] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-white/[0.1] hover:bg-white/[0.16] transition-colors"
          >
            Done
          </button>
        </div>
      </aside>
    </div>
  );
};

export default DetailsDrawer;
