import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Bot, Check, ChevronRight, CornerDownLeft, Loader2, Send, Sparkles, User, Wrench } from 'lucide-react';
import { ApiClient } from '../api/client';
import HospitalCard from './HospitalCard';
import { formatINR, getDataModeBadge } from '../utils/formatters';

const SUGGESTIONS = [
  "Find affordable cardiology hospitals in Hyderabad",
  "What is the indicative cost of Angioplasty?",
  "Which government schemes cover heart surgery?",
  "Book a simulated appointment at Apollo Health City"
];

export default function ChatInterface({ onSelectBookHospital }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'agent',
      text: (
        "Hello! I am your **Healthcare Cost and Care Navigation AI Agent**.\n\n" +
        "I can help you locate accredited hospitals, estimate treatment costs across room tiers, " +
        "and discover cashless public healthcare schemes like **Ayushman Bharat (PM-JAY)** and **Aarogyasri**.\n\n" +
        "How can I assist your family today?"
      ),
      hospitals: [],
      cost_estimate: null,
      schemes: [],
      tool_calls: [],
      data_mode: 'mock'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (messageText = input) => {
    const trimmed = (messageText || '').trim();
    if (!trimmed || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await ApiClient.sendChatMessage(trimmed, "demo-session");

      const agentMsg = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: response.answer,
        hospitals: response.hospitals || [],
        cost_estimate: response.cost_estimate || null,
        schemes: response.schemes || [],
        tool_calls: response.tool_calls || [],
        requires_confirmation: response.requires_confirmation || false,
        confirmation_prompt: response.confirmation_prompt || null,
        emergency_detected: response.emergency_detected || false,
        data_mode: response.data_mode || 'mock',
        disclaimer: response.disclaimer,
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'agent',
          text: "I encountered an error connecting to the navigation engine. Falling back to local offline mock data.",
          hospitals: [],
          tool_calls: [],
          data_mode: 'mock'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[550px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      
      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => {
          const isAgent = msg.sender === 'agent';
          const badge = isAgent && msg.data_mode ? getDataModeBadge(msg.data_mode) : null;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl ${isAgent ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-sm ${
                  isAgent
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
                    : 'bg-slate-800 dark:bg-slate-700'
                }`}
              >
                {isAgent ? <Bot className="w-5 h-5" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Bubble Container */}
              <div className="space-y-3 max-w-[88%] sm:max-w-[82%]">
                
                {/* Text Bubble */}
                <div
                  className={`p-4 rounded-3xl text-sm leading-relaxed ${
                    isAgent
                      ? 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80'
                      : 'bg-emerald-600 text-white rounded-br-sm shadow-sm'
                  }`}
                >
                  {/* Emergency Intercept Alert */}
                  {msg.emergency_detected && (
                    <div className="mb-3 p-3 bg-rose-500 text-white font-bold rounded-2xl flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <span>URGENT EMERGENCY ALERT: IMMEDIATE ATTENTION REQUIRED</span>
                    </div>
                  )}

                  {/* Message body markdown formatting */}
                  <div className="whitespace-pre-line space-y-2">
                    {msg.text}
                  </div>

                  {/* Tool Call Badges */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-2">
                      {msg.tool_calls.map((tc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-mono border border-emerald-300/40"
                        >
                          <Wrench className="w-3 h-3 text-emerald-600" />
                          <span>Tool: {tc.tool}</span>
                          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-sans font-bold">
                            {tc.result_count} items
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confirmation Prompt Button */}
                  {msg.requires_confirmation && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                        {msg.confirmation_prompt}
                      </span>
                      <button
                        onClick={() => onSelectBookHospital({ id: "hosp-hyd-01", name: "Apollo Hospitals, Jubilee Hills", specialties: ["Cardiology"] })}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
                      >
                        Proceed to Simulation Form
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Cost Estimate Card */}
                {msg.cost_estimate && (
                  <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-4 rounded-3xl border border-emerald-500/20 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {msg.cost_estimate.procedure}
                      </span>
                      <span className="text-emerald-600 font-extrabold text-sm">
                        Avg: {formatINR(msg.cost_estimate.average_cost)}
                      </span>
                    </div>
                    <div className="flex gap-4 text-slate-600 dark:text-slate-400">
                      <span>Range: {formatINR(msg.cost_estimate.indicative_range_min)} – {formatINR(msg.cost_estimate.indicative_range_max)}</span>
                      <span>Tier: {msg.cost_estimate.room_type}</span>
                    </div>
                  </div>
                )}

                {/* Inline Hospital Cards List */}
                {msg.hospitals && msg.hospitals.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Recommended Hospitals ({msg.hospitals.length})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {msg.hospitals.slice(0, 4).map((hosp) => (
                        <HospitalCard
                          key={hosp.id}
                          hospital={hosp}
                          onSelectBook={(selected) => onSelectBookHospital(selected)}
                        />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 max-w-md items-center">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Analyzing healthcare query & executing navigation tools...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-500" /> Suggestions:
        </span>
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            className="text-xs whitespace-nowrap px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-full text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about hospital care, indicative surgery costs, or scheme eligibility..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-all shadow-sm shrink-0 active:scale-95"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Academic Capstone Demo • Emergency inputs automatically trigger 108/112 ER redirection.
        </p>
      </div>

    </div>
  );
}
