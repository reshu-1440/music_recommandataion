import React from 'react';

export type TabId = 'tracks' | 'why' | 'signals' | 'library';

interface TabItem {
  id: TabId;
  label: string;
  badge?: number | string;
}

interface ResultTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  className?: string;
}

const TABS: TabItem[] = [
  { id: 'tracks', label: 'Tracks' },
  { id: 'why', label: 'Why these?' },
  { id: 'signals', label: 'Preference signals' }
];

export const ResultTabs: React.FC<ResultTabsProps> = ({ activeTab, onTabChange, className = '' }) => {
  return (
    <div className={`border-b border-white/[0.08] mb-6 ${className}`}>
      <div className="flex items-center gap-6" role="tablist">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`relative pb-3 text-sm font-medium transition-colors duration-150 bg-transparent focus-visible:outline-none focus-visible:text-white ${
                isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full transition-all duration-200" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ResultTabs;
