import React from 'react';
import { ModeToggle } from './ModeToggle';

interface ResultsHeaderProps {
  query?: string;
  count: number;
  mode: 'familiar' | 'explore';
  onModeChange: (mode: 'familiar' | 'explore') => void;
  className?: string;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  query,
  count,
  mode,
  onModeChange,
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 ${className}`}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Your listening mix
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1 line-clamp-1 max-w-xl">
          {query ? (
            <>
              Recommendations for: <span className="text-zinc-200 font-medium">“{query}”</span>
            </>
          ) : (
            `Curated for your current intent · ${count} tracks`
          )}
        </p>
      </div>

      <ModeToggle mode={mode} onChange={onModeChange} />
    </div>
  );
};

export default ResultsHeader;
