import React from 'react';
import {
  ArrowRightLeft,
  Scale,
  ShieldAlert,
  CalendarClock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ModuleType } from '../types/index.ts';

interface ModuleGridProps {
  onSelectModule: (module: ModuleType) => void;
  activeRunCounts?: Record<string, number>;
}

export const ModuleGrid: React.FC<ModuleGridProps> = ({
  onSelectModule,
  activeRunCounts = {},
}) => {
  const modules = [
    {
      id: 'reconciliation' as ModuleType,
      title: 'Reconciliation Intelligence',
      badgeLabel: 'Module 01',
      description: 'Find mismatches. Trace causes. Resolve exceptions.',
      accentColor: '#FFD629', // vibrant yellow
      tagColor: 'bg-[#FFD629]',
      icon: ArrowRightLeft,
    },
    {
      id: 'decision' as ModuleType,
      title: 'Decision Intelligence',
      badgeLabel: 'Module 02',
      description: 'Understand decisions with clear, evidence-based explanations.',
      accentColor: '#10B981', // vibrant green
      tagColor: 'bg-[#10B981]',
      icon: Scale,
    },
    {
      id: 'risk' as ModuleType,
      title: 'Risk & Exposure Intelligence',
      badgeLabel: 'Module 03',
      description: 'Reveal conflicting figures, hidden exposure, and risk drivers.',
      accentColor: '#FB7185', // vibrant pink
      tagColor: 'bg-[#FB7185]',
      icon: ShieldAlert,
    },
    {
      id: 'close' as ModuleType,
      title: 'Close Intelligence',
      badgeLabel: 'Module 04',
      description: 'Track blockers, dependencies, delays, and financial impact.',
      accentColor: '#A855F7', // vibrant purple
      tagColor: 'bg-[#A855F7]',
      icon: CalendarClock,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Product Branding Section */}
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black tracking-tight flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
          <span>Decisiq</span>
          <span className="bg-[#FFD629] px-2.5 py-0.5 border-2 border-black rounded-xl shadow-neo-sm font-black inline-block">
            360
          </span>
        </h1>
        <p className="mt-2 text-sm sm:text-base font-semibold text-neutral-800">
          Financial intelligence. Clear decisions. Complete control.
        </p>
      </div>

      {/* Responsive Two-Column Grid for Four Main Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {modules.map((m) => {
          const Icon = m.icon;
          const runCount = activeRunCounts[m.id] || 0;

          return (
            <div
              key={m.id}
              onClick={() => onSelectModule(m.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectModule(m.id);
                }
              }}
              className="group relative flex flex-col justify-between bg-white border-2 border-black rounded-2xl p-5 sm:p-6 shadow-neo-md hover:shadow-neo-lg hover:-translate-x-0.5 hover:-translate-y-1 transition-all duration-150 cursor-pointer text-left select-none"
              aria-label={`Open ${m.title} workspace`}
            >
              {/* Folder-Tab Accent Inspired by the Reference */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black text-black font-black text-xs shadow-neo-sm"
                  style={{ backgroundColor: m.accentColor }}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{m.badgeLabel}</span>
                </div>

                {runCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-black bg-neutral-100 text-[11px] font-bold text-black font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {runCount} {runCount === 1 ? 'run' : 'runs'}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-2 flex-1">
                <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight group-hover:text-neutral-900">
                  {m.title}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-neutral-700 leading-relaxed">
                  {m.description}
                </p>
              </div>

              {/* Bottom Action Strip with Small Directional Arrow */}
              <div className="mt-5 pt-4 border-t-2 border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-black text-black flex items-center gap-1 group-hover:underline">
                  Open Workspace
                </span>
                <div
                  className="w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center text-black shadow-neo-sm group-hover:shadow-neo group-hover:translate-x-0.5 transition-all"
                  style={{ backgroundColor: m.accentColor }}
                >
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
