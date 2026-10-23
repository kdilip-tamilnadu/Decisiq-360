import React from 'react';
import {
  Sliders,
  Search,
  Sparkles,
  LayoutDashboard,
  ArrowLeft,
} from 'lucide-react';
import { ModuleType } from '../types/index.ts';

interface HeaderProps {
  activeView: ModuleType | 'home' | 'executive';
  onSelectView: (view: ModuleType | 'home' | 'executive') => void;
  onOpenAudit?: () => void;
  onOpenDataManagement: () => void;
  onOpenSearch: () => void;
  onOpenSupport: () => void;
  activeRunCounts?: Record<string, number>;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onOpenAudit: _onOpenAudit,
  onOpenDataManagement,
  onOpenSearch,
  onOpenSupport,
  activeRunCounts = {},
}) => {
  const totalRuns = Object.values(activeRunCounts).reduce((a, b) => a + b, 0);

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF8]/95 backdrop-blur-md border-b-2 border-black">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left Controls: Settings & optional Return Home */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenDataManagement}
            className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center text-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active active:translate-x-0 active:translate-y-0 transition-all focus:outline-none"
            title="Settings & Data Management"
            aria-label="Settings and Data Management"
          >
            <Sliders className="w-4 h-4 stroke-[2.2]" />
          </button>

          {activeView !== 'home' && (
            <button
              onClick={() => onSelectView('home')}
              className="h-10 px-3.5 rounded-xl bg-white border-2 border-black flex items-center gap-2 text-xs font-black text-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active active:translate-x-0 active:translate-y-0 transition-all focus:outline-none"
              title="Return to 4 Modules Overview"
              aria-label="Back to Modules"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Overview</span>
            </button>
          )}

          {activeView !== 'home' && (
            <button
              onClick={() => onSelectView('home')}
              className="text-left hidden md:block ml-2 focus:outline-none"
              aria-label="Decisiq 360 Home"
            >
              <span className="font-black text-sm tracking-tight text-black">
                Decisiq <span className="bg-[#FFD629] px-1 py-0.5 border border-black rounded text-[11px] font-black">360</span>
              </span>
            </button>
          )}
        </div>

        {/* Right Controls: Executive Room, Audit, Support Assistant, Search */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => onSelectView('executive')}
            className={`h-10 px-3 rounded-xl border-2 border-black flex items-center gap-1.5 text-xs font-black transition-all shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active active:translate-x-0 active:translate-y-0 focus:outline-none ${
              activeView === 'executive'
                ? 'bg-[#FFD629] text-black ring-2 ring-black ring-offset-1'
                : 'bg-white text-black hover:bg-neutral-50'
            }`}
            title="Executive Portfolio Control Room"
            aria-label="Executive Control Room"
          >
            <LayoutDashboard className="w-3.5 h-3.5 stroke-[2.2]" />
            <span className="hidden sm:inline">Executive Room</span>
            {totalRuns > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 border border-black" />
            )}
          </button>

          <button
            onClick={onOpenSupport}
            className="h-10 px-3 sm:px-3.5 rounded-xl bg-[#FFD629] border-2 border-black flex items-center gap-1.5 text-xs font-black text-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active active:translate-x-0 active:translate-y-0 transition-all focus:outline-none"
            title="Gemini-Powered In-App Support Assistant"
            aria-label="AI Support Assistant"
          >
            <Sparkles className="w-4 h-4 stroke-[2.2] fill-amber-300" />
            <span className="hidden sm:inline">Support</span>
          </button>

          <button
            onClick={onOpenSearch}
            className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center text-black shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-neo-active active:translate-x-0 active:translate-y-0 transition-all focus:outline-none"
            title="Search Workspace & Records (Ctrl+K)"
            aria-label="Search"
          >
            <Search className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </header>
  );
};
