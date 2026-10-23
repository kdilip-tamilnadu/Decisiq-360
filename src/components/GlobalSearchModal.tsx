import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  FileCheck2,
  Scale,
  ShieldAlert,
  CalendarClock,
  ArrowRight,
  AlertTriangle,
  FileText,
  Sliders,
  ScrollText,
} from 'lucide-react';
import { ModuleType, Finding } from '../types/index.ts';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (module: ModuleType | 'home' | 'executive') => void;
  onOpenAudit: () => void;
  onOpenSettings: () => void;
  onOpenFinding?: (finding: Finding) => void;
  activeFindings?: Finding[];
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectModule,
  onOpenAudit,
  onOpenSettings,
  onOpenFinding,
  activeFindings = [],
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      window.addEventListener('keydown', handleKeyDown);
    } else {
      setQuery('');
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Static searchable workspaces & navigation
  const workspaces = [
    {
      id: 'reconciliation' as ModuleType,
      title: 'Reconciliation Intelligence',
      subtitle: 'Bank statement & general ledger matching engine',
      category: 'Workspace',
      color: '#FFD629',
      icon: FileCheck2,
    },
    {
      id: 'decision' as ModuleType,
      title: 'Decision Intelligence',
      subtitle: 'Credit underwriting & deterministic policy audit',
      category: 'Workspace',
      color: '#10B981',
      icon: Scale,
    },
    {
      id: 'risk' as ModuleType,
      title: 'Risk & Exposure Intelligence',
      subtitle: 'Counterparty concentration & stress test scenarios',
      category: 'Workspace',
      color: '#FB7185',
      icon: ShieldAlert,
    },
    {
      id: 'close' as ModuleType,
      title: 'Close Intelligence',
      subtitle: 'Critical path scheduling & month-end blocker tracking',
      category: 'Workspace',
      color: '#A855F7',
      icon: CalendarClock,
    },
    {
      id: 'executive' as any,
      title: 'Executive Control Room',
      subtitle: 'Cross-module executive synthesis & portfolio health',
      category: 'Workspace',
      color: '#FFD629',
      icon: FileText,
    },
  ];

  const tools = [
    {
      title: 'Audit Log & Provenance',
      subtitle: 'Inspect immutable cryptographic event trail',
      category: 'System Tool',
      icon: ScrollText,
      action: () => {
        onClose();
        onOpenAudit();
      },
    },
    {
      title: 'Settings & Data Reset',
      subtitle: 'Configure storage, cache, and safe module clear',
      category: 'System Tool',
      icon: Sliders,
      action: () => {
        onClose();
        onOpenSettings();
      },
    },
  ];

  const filteredWorkspaces = workspaces.filter(
    (w) => !q || w.title.toLowerCase().includes(q) || w.subtitle.toLowerCase().includes(q)
  );

  const filteredTools = tools.filter(
    (t) => !q || t.title.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q)
  );

  const filteredFindings = activeFindings.filter(
    (f) =>
      !q ||
      f.title.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
  );

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-search-title"
    >
      <div className="w-full max-w-xl bg-[#FFFDF8] border-2 border-black rounded-2xl shadow-neo-lg overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 bg-white border-b-2 border-black flex items-center gap-3">
          <Search className="w-5 h-5 text-black shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspaces, findings, records, or tools..."
            className="flex-1 bg-transparent text-sm font-semibold text-black placeholder:text-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-neutral-500 hover:text-black"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-mono font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Workspaces Section */}
          {filteredWorkspaces.length > 0 && (
            <div>
              <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-2">
                Intelligence Modules & Rooms
              </div>
              <div className="space-y-1.5">
                {filteredWorkspaces.map((w) => {
                  const Icon = w.icon;
                  return (
                    <div
                      key={w.id}
                      onClick={() => {
                        onSelectModule(w.id);
                        onClose();
                      }}
                      className="p-3 bg-white hover:bg-[#FFFDF8] border-2 border-black rounded-xl shadow-neo-sm hover:-translate-y-0.5 hover:shadow-neo transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center shrink-0"
                          style={{ backgroundColor: w.color }}
                        >
                          <Icon className="w-4 h-4 text-black" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-black truncate group-hover:underline">
                            {w.title}
                          </h4>
                          <p className="text-[11px] text-neutral-600 truncate">{w.subtitle}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-black transition-colors shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Findings if matches */}
          {filteredFindings.length > 0 && (
            <div>
              <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-2">
                Active Audit Findings ({filteredFindings.length})
              </div>
              <div className="space-y-1.5">
                {filteredFindings.slice(0, 5).map((f) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      if (onOpenFinding) onOpenFinding(f);
                      onSelectModule(f.module);
                      onClose();
                    }}
                    className="p-3 bg-white hover:bg-amber-50 border-2 border-black rounded-xl shadow-neo-sm hover:-translate-y-0.5 hover:shadow-neo transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-400 border-2 border-black flex items-center justify-center shrink-0 text-black">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 bg-black text-white rounded">
                            {f.module}
                          </span>
                          <h4 className="text-xs font-bold text-black truncate">{f.title}</h4>
                        </div>
                        <p className="text-[11px] text-neutral-600 truncate mt-0.5">
                          {f.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full capitalize shrink-0">
                      {f.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tools Section */}
          {filteredTools.length > 0 && (
            <div>
              <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-2">
                Workspaces & Administration
              </div>
              <div className="space-y-1.5">
                {filteredTools.map((t, idx) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={idx}
                      onClick={t.action}
                      className="p-3 bg-white hover:bg-neutral-50 border-2 border-black rounded-xl shadow-neo-sm hover:-translate-y-0.5 hover:shadow-neo transition cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 border-2 border-black flex items-center justify-center shrink-0 text-black">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-black">{t.title}</h4>
                          <p className="text-[11px] text-neutral-600">{t.subtitle}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredWorkspaces.length === 0 &&
            filteredFindings.length === 0 &&
            filteredTools.length === 0 && (
              <div className="text-center py-8 text-neutral-500 text-xs font-medium">
                No matching workspaces, findings, or tools found for "{query}".
              </div>
            )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-neutral-50 border-t-2 border-black flex items-center justify-between text-[11px] text-neutral-600 font-mono">
          <span>Decisiq 360 Search</span>
          <span>Tab / Click to navigate</span>
        </div>
      </div>
    </div>
  );
};
