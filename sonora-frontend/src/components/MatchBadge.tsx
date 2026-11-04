import React from 'react';

interface MatchBadgeProps {
  score: string | number;
  className?: string;
}

export const MatchBadge: React.FC<MatchBadgeProps> = ({ score, className = '' }) => {
  const displayScore = typeof score === 'number' ? `${score}%` : score.toString().endsWith('%') ? score : `${score}%`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-[#C6F26B]/10 text-[#C6F26B] border border-[#C6F26B]/25 transition-all duration-200 ${className}`}
      title={`Semantic Vector Relevance: ${displayScore}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#C6F26B] shadow-[0_0_8px_#C6F26B]" />
      {displayScore} match
    </span>
  );
};

export default MatchBadge;
