import React from 'react';
import { CpuIcon } from './icons';

interface SemanticSnapshotProps {
  retrievalSnapshot?: {
    intent_id?: string;
    catalog_id?: string;
    ranking_mode?: string;
    retrieval?: string;
  };
  onOpenDetails?: () => void;
  className?: string;
}

export const SemanticSnapshot: React.FC<SemanticSnapshotProps> = ({
  retrievalSnapshot,
  onOpenDetails,
  className = ''
}) => {
  return (
    <section
      className={`mt-8 p-5 sm:p-6 rounded-2xl bg-[#141417] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4 select-none ${className}`}
    >
      <div className="flex items-start md:items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-400 shrink-0">
          <CpuIcon size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Semantic Audio Retrieval</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
              Active Telemetry
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Matched to: <span className="text-zinc-200 font-medium">Acoustic warmth, mellow tempo & introspective focus</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onOpenDetails && (
          <button
            type="button"
            onClick={onOpenDetails}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 bg-white/[0.06] hover:bg-white/[0.12] hover:text-white border border-white/[0.08] transition-colors"
          >
            <span>View Technical Internals</span>
            <span className="text-zinc-500 font-mono text-[10px]">RQ-KMEANS</span>
          </button>
        )}
      </div>
    </section>
  );
};

export default SemanticSnapshot;
