'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Zap,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api';

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  providerUsed?: string;
  executedTools?: any[];
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const role = currentUser?.role || 'Employee';
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello ${currentUser?.name || 'there'}! I am your MetaGlide HCM Assistant. How can I assist you with attendance, policies, leaves, or organizational queries today?`,
      providerUsed: 'Gemini',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string>('Gemini');
  const [aiStatus, setAiStatus] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Role-based suggested prompt chips
  const suggestions = {
    Admin: [
      'What is our total active headcount by department?',
      'Summarize our latest payroll cost and employee count',
      'Who checked in late today?',
      'Are there pending leave requests awaiting approval?',
    ],
    HR: [
      'How many employees are present vs absent today?',
      'Who are the late-comers today?',
      'Give me a summary of all pending leave requests',
      'Search for employees in Engineering',
    ],
    Employee: [
      'What is my remaining leave balance?',
      'Explain the company late attendance policy and grace period',
      'How many standard hours per work week?',
      'What are the requirements for sick leave?',
    ],
  }[role as 'Admin' | 'HR' | 'Employee'] || [
    'What is my remaining leave balance?',
    'What are company working hours?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      api.ai.status().then((res: any) => setAiStatus(res)).catch(() => {});
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Send neutral format history
      const formattedForApi = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.ai.chat(formattedForApi);

      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.content || 'I completed your request.',
            providerUsed: res.providerUsed || 'Gemini',
            executedTools: res.executedTools,
          },
        ]);
        if (res.providerUsed) {
          setCurrentProvider(res.providerUsed);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.message || 'Sorry, I encountered an issue. Please try again.',
            providerUsed: 'Fallback Engine',
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `AI processing temporarily paused: ${err.message}. You can also use the direct form tabs in the sidebar.`,
          providerUsed: 'Offline',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Admin forced fallback testing
  const handleTriggerFallback = async () => {
    try {
      await api.ai.testFallback();
      api.ai.status().then((res: any) => setAiStatus(res));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Gemini has been placed on simulated 10-minute cooldown! Your next requests will automatically and seamlessly route to Groq (Llama 3.3).',
          providerUsed: 'System',
        },
      ]);
    } catch {}
  };

  const handleResetCooldown = async () => {
    try {
      await api.ai.resetCooldown();
      api.ai.status().then((res: any) => setAiStatus(res));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Gemini cooldown reset! Primary routing to Gemini has been restored.',
          providerUsed: 'System',
        },
      ]);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-lg bg-[var(--card)] border-l border-[var(--border)] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[#12213F] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0A66C2] to-[#1DE0FF] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                <span>HCM AI Assistant</span>
                {/* Powered by Provider Badge */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    currentProvider === 'Groq'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                      : 'bg-cyan-950/80 text-cyan-300 border-cyan-600/50'
                  }`}
                >
                  Powered by {currentProvider}
                </span>
              </div>
              <p className="text-[10px] text-slate-300">MetaGlide Marketing Intelligence</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fallback & Provider Status Bar (for Admins & visibility) */}
        {role === 'Admin' && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-[var(--border)] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <Zap className="w-3.5 h-3.5 text-[#10AEE6]" />
              <span>
                {aiStatus?.gemini?.onCooldown
                  ? `Gemini Cooldown Active (${aiStatus.gemini.cooldownRemainingSeconds}s)`
                  : 'Gemini Primary Active'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!aiStatus?.gemini?.onCooldown ? (
                <button
                  type="button"
                  onClick={handleTriggerFallback}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30 transition"
                  title="Simulate Gemini failure to test Groq fallback"
                >
                  Force Groq Fallback
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetCooldown}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/30 transition flex items-center gap-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset to Gemini
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#0A66C2] to-[#10AEE6] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-gradient-to-r from-[#0A66C2] to-[#10AEE6] text-white rounded-tr-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-[var(--text)] border border-[var(--border)] rounded-tl-xs'
                  }`}
                >
                  {/* Message Content with basic Markdown formatting */}
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Provider label & tool calls badge */}
                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        AI-generated answer
                      </span>
                      {m.providerUsed && (
                        <span className="font-semibold text-[#0A66C2] dark:text-[#1DE0FF]">
                          via {m.providerUsed}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl bg-[#12213F] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-[10px] font-bold">
                    ME
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex gap-3 items-center">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#0A66C2] to-[#10AEE6] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/80 border border-[var(--border)] rounded-2xl px-4 py-3 rounded-tl-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0A66C2] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#10AEE6] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[#1DE0FF] animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-[var(--text-muted)] ml-1.5">AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border-t border-[var(--border)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-[#10AEE6]" /> Suggested Questions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(s)}
                disabled={loading}
                className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-[var(--card)] hover:bg-[#0A66C2] hover:text-white border border-[var(--border)] text-[var(--text)] transition disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--card)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about policies, leaves, attendance..."
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-slate-100 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2] transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-[#0A66C2] to-[#10AEE6] text-white hover:opacity-90 disabled:opacity-40 transition shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
