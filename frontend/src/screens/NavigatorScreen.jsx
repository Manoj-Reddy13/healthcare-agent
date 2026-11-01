import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  CornerDownLeft,
  ExternalLink,
  HeartPulse,
  Info,
  Loader2,
  PhoneCall,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Wrench
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR, getDataModeBadge } from '../utils/formatters';

const PRESET_QUERIES = [
  "Find affordable cardiology hospitals in Hyderabad and estimate the cost of angioplasty.",
  "Which government schemes cover knee replacement surgery in Telangana?",
  "What is the indicative cost range for a normal delivery vs C-section?",
  "Can senior citizens aged 70+ get cashless treatment under PM-JAY?",
  "I want to book a simulated appointment at Apollo Health City"
];

export default function NavigatorScreen({ onNavigate }) {
  const { city, updatePlan, setActiveHospitalDetails, setSelectedHospitalForBooking } = useHealthcare();
  const [messages, setMessages] = useState([
    {
      id: 'msg-welcome',
      sender: 'agent',
      text: (
        "Hello! I am your **CareNav AI Healthcare Navigator**.\n\n" +
        "I can help you locate accredited hospitals, estimate treatment costs across room tiers, " +
        "and discover cashless public healthcare schemes like **Ayushman Bharat (PM-JAY)** and **Aarogyasri**.\n\n" +
        "How can I assist your family's healthcare plan today?"
      ),
      hospitals: [],
      cost_estimate: null,
      schemes: [],
      tool_calls: [],
      data_mode: 'verified',
      activeTab: 'all'
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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await ApiClient.sendChatMessage(trimmed, "demo-session");

      // Auto update plan if cost or hospital returned
      if (response.cost_estimate) {
        updatePlan({
          treatment: response.cost_estimate.procedure,
          costMin: response.cost_estimate.indicative_range_min,
          costMax: response.cost_estimate.indicative_range_max,
          averageCost: response.cost_estimate.average_cost
        });
      }
      if (response.hospitals?.length) {
        updatePlan({
          hospitalId: response.hospitals[0].id,
          hospitalName: response.hospitals[0].name
        });
      }

      const agentMsg = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: response.answer || "I processed your request with the healthcare tools.",
        emergency_detected: response.emergency_detected,
        hospitals: response.hospitals || [],
        cost_estimate: response.cost_estimate || null,
        schemes: response.schemes || [],
        tool_calls: response.tool_calls || [],
        requires_confirmation: response.requires_confirmation,
        confirmation_prompt: response.confirmation_prompt,
        disclaimer: response.disclaimer,
        data_mode: response.data_mode || 'mock',
        activeTab: 'all',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          text: "I am having trouble reaching the healthcare knowledge engine. Please check your network or try one of the preset prompts below.",
          emergency_detected: false,
          hospitals: [],
          cost_estimate: null,
          schemes: [],
          tool_calls: [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 max-w-5xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-800">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>AI Healthcare Navigator</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Live Agent
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Get personalized answers on hospitals, treatment costs, and government schemes.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([
              {
                id: 'msg-welcome-new',
                sender: 'agent',
                text: "Chat cleared. What procedure, hospital, or government scheme can I look up for you in " + city + "?",
                hospitals: [],
                cost_estimate: null,
                schemes: [],
                tool_calls: [],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Reset Chat
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 overflow-y-auto space-y-6">
        
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Agent Avatar */}
              {!isUser && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-sm space-y-3.5 leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 rounded-tr-none'
                    : msg.emergency_detected
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-900 rounded-tl-none'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-none'
                }`}
              >
                {/* Emergency High Alert Notice */}
                {msg.emergency_detected && (
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider pb-1 border-b border-rose-200 dark:border-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                    <span>Emergency Warning Detected</span>
                  </div>
                )}

                {/* Text Content */}
                <div className="whitespace-pre-line prose prose-sm dark:prose-invert max-w-none">
                  {msg.text}
                </div>

                {/* Structured Interactive Filter Chips (Matching Reference Image) */}
                {!isUser && (msg.hospitals?.length > 0 || msg.cost_estimate || msg.schemes?.length > 0) && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                    
                    {/* 4 Interactive Quick Chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.hospitals?.length > 0 && (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Hospitals ({msg.hospitals.length})</span>
                        </div>
                      )}

                      {msg.cost_estimate && (
                        <div className="px-3 py-1.5 rounded-xl bg-blue-100/80 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 border border-blue-300 dark:border-blue-800">
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Cost Estimate: ₹</span>
                        </div>
                      )}

                      {msg.schemes?.length > 0 && (
                        <div className="px-3 py-1.5 rounded-xl bg-amber-100/80 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-amber-300 dark:border-amber-800">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Scheme Coverage</span>
                        </div>
                      )}

                      <button
                        onClick={() => onNavigate('plan')}
                        className="px-3 py-1.5 rounded-xl bg-purple-100/80 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 border border-purple-300 dark:border-purple-800 hover:bg-purple-200 transition-colors"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Next Steps</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Inline Cost Estimate Card */}
                    {msg.cost_estimate && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-500">Indicative Benchmark:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatINR(msg.cost_estimate.indicative_range_min)} – {formatINR(msg.cost_estimate.indicative_range_max)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Room Tier: {msg.cost_estimate.room_type || 'Semi-Private'}</span>
                          <button
                            onClick={() => onNavigate('estimator')}
                            className="text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                          >
                            <span>Detailed Breakdown</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline Hospitals Mini Cards */}
                    {msg.hospitals?.length > 0 && (
                      <div className="space-y-2">
                        {msg.hospitals.slice(0, 2).map((h) => (
                          <div
                            key={h.id}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white">{h.name}</h4>
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  {h.accreditation?.[0] || 'NABH'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {h.address ? h.address.slice(0, 48) + '...' : `${city} (~${h.distance_km} km)`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setActiveHospitalDetails(h)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                View
                              </button>
                              <button
                                onClick={() => setSelectedHospitalForBooking(h)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                              >
                                Book
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}

                {/* Simulated Appointment Trigger */}
                {msg.requires_confirmation && (
                  <div className="pt-2">
                    <button
                      onClick={() => onNavigate('hospitals')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Select Hospital to Book Simulated Slot</span>
                    </button>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 text-right pt-1">
                  {msg.time}
                </div>
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-1 font-bold text-xs shadow-sm">
                  M
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 items-center text-slate-400 text-xs animate-pulse">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Analyzing medical packages & regional guidelines...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 shrink-0 scrollbar-none text-xs">
        <span className="text-[11px] text-slate-400 font-bold shrink-0">Try asking:</span>
        {PRESET_QUERIES.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-600 dark:text-slate-300 text-xs font-medium shrink-0 transition-colors shadow-sm"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md shrink-0 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Ask about hospitals, treatment costs, or government schemes..."
          className="flex-1 px-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent placeholder-slate-400 focus:outline-none"
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shrink-0 shadow-md shadow-emerald-600/30"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}

