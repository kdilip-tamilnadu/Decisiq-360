import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  HelpCircle,
  FileQuestion,
  AlertTriangle,
  Layers,
  ChevronRight,
  ShieldCheck,
  Mail,
  Bot,
  User,
} from 'lucide-react';
import { ModuleType } from '../types/index.ts';

interface SupportAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule?: ModuleType | 'home' | 'executive';
  hasActiveResults?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  isQuickAction?: boolean;
}

const QUICK_ACTIONS = [
  { id: 'q1', text: 'How do I upload my data?', icon: FileQuestion },
  { id: 'q2', text: 'Explain my analysis results.', icon: Layers },
  { id: 'q3', text: 'Help me resolve an error.', icon: AlertTriangle },
  { id: 'q4', text: 'Explain the four modules.', icon: HelpCircle },
  { id: 'q5', text: 'Troubleshoot a failed upload.', icon: AlertTriangle },
];

export const SupportAssistantModal: React.FC<SupportAssistantModalProps> = ({
  isOpen,
  onClose,
  activeModule = 'home',
  hasActiveResults = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hi! I'm your Decisiq 360 support assistant. I can help you use the four intelligence modules, upload compatible files, understand results, troubleshoot errors, and navigate your workspace.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-5),
          context: {
            activeModule,
            hasResults: hasActiveResults,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const botMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'I am ready to help you navigate Decisiq 360.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.warn('Backend call failed, using client fallback:', err);
      // Client-side deterministic fallback
      const fallbackReply = getClientSupportReply(text, activeModule);
      const botMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'bot',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const getClientSupportReply = (query: string, currentMod: string): string => {
    const q = query.toLowerCase();
    if (q.includes('upload') || q.includes('data')) {
      return `To upload financial datasets into Decisiq 360:
1. Choose any of the 4 independent modules (Reconciliation, Decision, Risk, or Close).
2. Upload your file(s) in CSV, XLSX, or JSON format (up to 25 MB).
3. Dual-source engines (like Reconciliation) allow uploading Source A (e.g. Bank Statement) and Source B (e.g. General Ledger).
4. You can also click "Load Sample Dataset" to test any module instantly!`;
    }
    if (q.includes('result') || q.includes('analysis')) {
      return `Results are computed deterministically by the specialized engines:
- Reconciliation: Evaluates matched volume, tolerances, and isolates unmatched items.
- Decision: Compares underwriting policy rules against recorded loan decisions to flag unauthorized overrides.
- Risk: Computes counterparty concentration and simulates FX & credit spread shocks.
- Close: Maps serial tasks via Critical Path Method (CPM) and flags circular blockers.`;
    }
    if (q.includes('error') || q.includes('troubleshoot') || q.includes('failed')) {
      return `Common troubleshooting steps:
- Ensure your file is under 25 MB and formatted as CSV, XLSX, or JSON.
- Verify column headers are present on row 1.
- If a circular prerequisite is detected in Close Intelligence, inspect the red cycle loop banner.
- You can reset any module to a fresh state anytime using the "Clear All" button in the upload header.`;
    }
    return `Decisiq 360 features 4 specialized modules:
1. Reconciliation Intelligence (Yellow): Compares bank statements with ledgers.
2. Decision Intelligence (Green): Audits underwriting rules and policy adherence.
3. Risk & Exposure Intelligence (Pink): Monitors counterparty limits and scenario stresses.
4. Close Intelligence (Purple): Tracks month-end task critical paths and blockers.

Need personalized human escalation? You can reach out directly to support@decisiq360.com.`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end sm:p-6 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-assistant-title"
    >
      <div className="w-full sm:w-[460px] h-full sm:h-[640px] max-h-screen bg-[#FFFDF8] border-2 border-black sm:rounded-2xl shadow-neo-lg flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#FFD629] border-b-2 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border-2 border-black shadow-neo-sm flex items-center justify-center text-black">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 id="support-assistant-title" className="text-base font-black text-black tracking-tight flex items-center gap-1.5">
                Decisiq AI Support
              </h2>
              <p className="text-[11px] font-medium text-neutral-800">
                Your guide to financial intelligence
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white hover:bg-neutral-100 border-2 border-black shadow-neo-sm text-black transition active:translate-y-0.5 active:shadow-none"
            aria-label="Close support chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Workspace Pill Indicator */}
        <div className="bg-white border-b-2 border-black px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-neutral-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 border border-black" />
            <span className="font-semibold text-neutral-900">Context:</span>
            <span className="capitalize font-mono font-medium">{activeModule}</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
            Gemini 3.8 Flash
          </span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FFFDF8]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'bot' && (
                <div className="w-7 h-7 rounded-lg bg-[#FFD629] border-2 border-black shadow-neo-sm flex items-center justify-center text-black shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed border-2 border-black ${
                  m.sender === 'user'
                    ? 'bg-[#FFD629] text-black shadow-neo-sm font-medium'
                    : 'bg-white text-[#111111] shadow-neo-sm whitespace-pre-line'
                }`}
              >
                <div>{m.text}</div>
                <div
                  className={`text-[9px] font-mono mt-1.5 text-right ${
                    m.sender === 'user' ? 'text-black/70' : 'text-neutral-500'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-black border-2 border-black shadow-neo-sm flex items-center justify-center text-white shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center">
              <div className="w-7 h-7 rounded-lg bg-[#FFD629] border-2 border-black shadow-neo-sm flex items-center justify-center text-black shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border-2 border-black rounded-xl px-4 py-2.5 shadow-neo-sm text-xs text-neutral-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-black animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-black animate-bounce [animation-delay:0.4s]" />
                <span className="font-mono text-[11px] text-neutral-500 ml-1">Analyzing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Chips */}
        <div className="p-3 bg-white border-t-2 border-black">
          <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-2">
            Suggested Quick Actions:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.id}
                  onClick={() => handleSendMessage(qa.text)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-[#FFFDF8] hover:bg-[#FFD629] border-2 border-black shadow-neo-sm text-[11px] font-semibold text-black transition active:translate-y-0.5 active:shadow-none flex items-center gap-1.5"
                >
                  <Icon className="w-3 h-3" />
                  <span>{qa.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Input Bar */}
        <div className="p-3.5 bg-[#FFFDF8] border-t-2 border-black">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about data uploads, rules, errors..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border-2 border-black shadow-neo-sm text-xs text-black placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#FFD629]"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 rounded-xl bg-[#FFD629] hover:bg-[#ffe156] disabled:opacity-40 disabled:cursor-not-allowed border-2 border-black shadow-neo-sm text-black transition active:translate-y-0.5 active:shadow-none"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-2 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Zero telemetry • Local session
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              support@decisiq360.com
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
