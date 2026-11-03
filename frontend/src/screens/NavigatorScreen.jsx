import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  CornerDownLeft,
  ExternalLink,
  FileCheck,
  FileText,
  HeartPulse,
  Info,
  Loader2,
  PhoneCall,
  Scale,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  Wrench,
  X
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR, getDataModeBadge } from '../utils/formatters';

const PRESET_QUERIES = [
  "Find affordable cardiology hospitals in Hyderabad and estimate the cost of angioplasty. Also, check if it is covered under PM-JAY.",
  "What are the causes, cardinal symptoms, and red flags of Coronary Artery Disease?",
  "Does Star Comprehensive cover angioplasty, and what is the waiting period for pre-existing diabetes?",
  "What is the specific disease waiting period for knee replacement and cataract surgery?"
];

export default function NavigatorScreen({ onNavigate }) {
  const { city, updatePlan, setActiveHospitalDetails, setSelectedHospitalForBooking } = useHealthcare();
  const [messages, setMessages] = useState([
    {
      id: 'msg-user-sample',
      sender: 'user',
      text: "Find affordable cardiology hospitals in Hyderabad and estimate the cost of angioplasty. Also, check if it is covered under PM-JAY.",
      time: '10:28 AM'
    },
    {
      id: 'msg-welcome',
      sender: 'agent',
      text: "Here is a complete overview for angioplasty in Hyderabad based on verified hospital benchmarks and government scheme registries:",
      activeTab: 'hospitals', // 'hospitals' | 'cost' | 'schemes' | 'steps' | 'medical' | 'clauses' | 'eligibility'
      hospitals: [
        {
          id: 'hosp-hyd-01',
          name: 'Apollo Health City, Jubilee Hills',
          address: 'Road No 72, Film Nagar, Jubilee Hills, Hyderabad',
          category: 'Private Multi-Specialty',
          accreditation: ['NABH', 'JCI'],
          contact_number: '040-2360 7777',
          est_cost: '₹1,50,000 – ₹2,40,000'
        },
        {
          id: 'hosp-hyd-02',
          name: 'Nizam’s Institute of Medical Sciences (NIMS)',
          address: 'Punjagutta Main Road, Hyderabad',
          category: 'Government Autonomous',
          accreditation: ['NABH'],
          contact_number: '040-2348 9000',
          est_cost: '₹85,000 – ₹1,40,000'
        },
        {
          id: 'hosp-hyd-03',
          name: 'Care Hospitals, Banjara Hills',
          address: 'Road No 1, Banjara Hills, Hyderabad',
          category: 'Private Tertiary Care',
          accreditation: ['NABH'],
          contact_number: '040-6165 6565',
          est_cost: '₹1,30,000 – ₹2,10,000'
        }
      ],
      cost_estimate: {
        procedure: "Angioplasty (PTCA with Stenting)",
        city: "Hyderabad",
        room_type: "Semi-Private",
        indicative_range_min: 120000,
        indicative_range_max: 250000,
        average_cost: 185000,
        breakdown: {
          procedure: { label: "Cath Lab & Stenting (DES)", min: 70000, max: 140000 },
          room: { label: "Room Charges (3 days, Semi-Private)", min: 15000, max: 30000 },
          doctor: { label: "Interventional Cardiologist Fee", min: 15000, max: 35000 },
          diagnostics: { label: "Pre-op ECG, Echo & Angiogram", min: 8000, max: 15000 },
          pharmacy: { label: "Post-op Medications & Consumables", min: 12000, max: 30000 }
        }
      },
      schemes: [
        {
          name: "Ayushman Bharat - PM-JAY",
          coverage_limit: 500000,
          status: "Covered under HBP Package (Angioplasty with single/double DES stent)"
        },
        {
          name: "Telangana Aarogyasri",
          coverage_limit: 1000000,
          status: "Covered for eligible white ration card holders at empanelled network hospitals"
        }
      ],
      time: '10:28 AM'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [llmStatus, setLlmStatus] = useState({
    active_provider: 'checking',
    model_id: '',
    is_live_llm: false
  });

  // LLM Key Configuration Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelIdInput, setModelIdInput] = useState('gemini-2.5-flash');
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');

  const handleProviderSelect = (prov) => {
    setSelectedProvider(prov);
    if (prov === 'gemini') setModelIdInput('gemini-2.5-flash');
    else if (prov === 'groq') setModelIdInput('llama-3.3-70b-versatile');
    else if (prov === 'openai') setModelIdInput('gpt-4o-mini');
  };

  const handleSaveLLM = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setConfigError("Please enter your API key.");
      return;
    }
    setConfigLoading(true);
    setConfigError('');
    setConfigSuccess('');
    try {
      const res = await ApiClient.configureLLM({
        provider: selectedProvider,
        apiKey: apiKeyInput.trim(),
        modelId: modelIdInput.trim()
      });
      setConfigSuccess(res.message || "Successfully connected to real LLM!");
      const updated = await ApiClient.fetchLLMStatus();
      if (updated) setLlmStatus(updated);
      setTimeout(() => {
        setShowConfigModal(false);
        setConfigSuccess('');
        setApiKeyInput('');
      }, 1400);
    } catch (err) {
      setConfigError(err.message || "Failed to validate API key with the provider.");
    } finally {
      setConfigLoading(false);
    }
  };
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    ApiClient.fetchLLMStatus().then((st) => st && setLlmStatus(st));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (customText) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);

    try {
      const response = await ApiClient.sendChatMessage(textToSend);

      // Auto-update plan context if data returned
      if (response.cost_estimate) {
        updatePlan({
          procedure: response.cost_estimate.procedure,
          costMin: response.cost_estimate.indicative_range_min,
          costMax: response.cost_estimate.indicative_range_max,
          avgCost: response.cost_estimate.average_cost
        });
      }
      if (response.hospitals?.length) {
        updatePlan({
          hospitalId: response.hospitals[0].id,
          hospitalName: response.hospitals[0].name
        });
      }

      // Determine initial active tab based on response content
      let defaultTab = 'steps';
      if (response.medical_explanation) {
        defaultTab = 'medical';
      } else if (response.retrieved_clauses?.length > 0) {
        defaultTab = 'clauses';
      } else if (response.eligibility_evaluation) {
        defaultTab = 'eligibility';
      } else if (response.hospitals?.length > 0) {
        defaultTab = 'hospitals';
      } else if (response.cost_estimate) {
        defaultTab = 'cost';
      } else if (response.schemes?.length > 0) {
        defaultTab = 'schemes';
      }

      const agentMsg = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: response.answer || "I processed your request using the verified healthcare data registries.",
        emergency_detected: response.emergency_detected,
        hospitals: response.hospitals || [],
        cost_estimate: response.cost_estimate || null,
        schemes: response.schemes || [],
        tool_calls: response.tool_calls || [],
        requires_confirmation: response.requires_confirmation,
        // Intelligence Extensions
        medical_explanation: response.medical_explanation || null,
        retrieved_clauses: response.retrieved_clauses || [],
        eligibility_evaluation: response.eligibility_evaluation || null,
        confidence_limitations: response.confidence_limitations || null,
        last_verification_date: response.last_verification_date || null,
        activeTab: defaultTab,
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

  const handleTabChange = (msgId, tabName) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, activeTab: tabName } : m))
    );
  };

  const getEligibilityBadgeStyle = (status) => {
    switch (status) {
      case 'Potentially covered':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Covered subject to conditions':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'Waiting period may apply':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Excluded according to retrieved clause':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 max-w-5xl mx-auto flex flex-col h-[calc(100vh-7.5rem)]">
      {/* 1. Top Header Bar (Matching Screen 2 in Reference Image) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shrink-0">
            <Bot className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>AI Healthcare Navigator</span>
              {llmStatus.is_live_llm ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {llmStatus.active_provider}: {llmStatus.model_id}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                  Offline Rule Engine (No API Key Configured)
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized guidance on hospitals, treatment costs, ICD-11 diseases, and health insurance policy wordings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowConfigModal(true)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
              llmStatus.is_live_llm
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{llmStatus.is_live_llm ? 'LLM Settings' : 'Connect Real LLM'}</span>
          </button>

          <button
            onClick={() => {
              setMessages([
                {
                  id: 'msg-welcome-new',
                  sender: 'agent',
                  text: "Chat cleared. What procedure, hospital, clinical condition, or health insurance policy can I assist you with in " + city + "?",
                  hospitals: [],
                  cost_estimate: null,
                  schemes: [],
                  tool_calls: [],
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
            }}
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Proactive Real LLM Banner */}
      {!llmStatus.is_live_llm && (
        <div className="bg-gradient-to-r from-amber-50 via-teal-50 to-emerald-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Power CareNav with a Real Neural LLM</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 uppercase tracking-wider">Free & Fast</span>
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                The agent is currently using local clinical rules. Connect your free Google Gemini API key or Groq key for full conversational reasoning and function calling.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            Connect API Key
          </button>
        </div>
      )}

      {/* 2. Messages Conversation Area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 overflow-y-auto space-y-6">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const hasInteractiveContent = !isUser && (
            msg.hospitals?.length > 0 ||
            msg.cost_estimate ||
            msg.schemes?.length > 0 ||
            msg.medical_explanation ||
            msg.retrieved_clauses?.length > 0 ||
            msg.eligibility_evaluation
          );

          return (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Agent Avatar */}
              {!isUser && (
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot className="w-5 h-5 stroke-[2.2]" />
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                className={`max-w-3xl rounded-2xl p-5 text-xs sm:text-sm space-y-4 leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-none shadow-xs'
                    : msg.emergency_detected
                    ? 'bg-rose-50 text-rose-950 border border-rose-300 rounded-tl-none shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs'
                }`}
              >
                {/* Emergency Notice */}
                {msg.emergency_detected && (
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider pb-2 border-b border-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                    <span>Emergency Warning Detected</span>
                  </div>
                )}

                {/* Main Text Content */}
                <div className="whitespace-pre-line leading-relaxed font-normal">
                  {msg.text}
                </div>

                {/* Interactive Pills & Tabs */}
                {hasInteractiveContent && (
                  <div className="space-y-4 pt-3 border-t border-slate-100">
                    
                    {/* Category Navigation Pills */}
                    <div className="flex flex-wrap gap-2">
                      {msg.medical_explanation && (
                        <button
                          type="button"
                          onClick={() => handleTabChange(msg.id, 'medical')}
                          className={`px-3 py-2 rounded-xl border text-center transition-all flex items-center gap-1.5 ${
                            msg.activeTab === 'medical'
                              ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-xs font-bold">MedGemma Clinical</span>
                        </button>
                      )}

                      {msg.retrieved_clauses?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleTabChange(msg.id, 'clauses')}
                          className={`px-3 py-2 rounded-xl border text-center transition-all flex items-center gap-1.5 ${
                            msg.activeTab === 'clauses'
                              ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-xs font-bold">Policy Clauses ({msg.retrieved_clauses.length})</span>
                        </button>
                      )}

                      {msg.eligibility_evaluation && (
                        <button
                          type="button"
                          onClick={() => handleTabChange(msg.id, 'eligibility')}
                          className={`px-3 py-2 rounded-xl border text-center transition-all flex items-center gap-1.5 ${
                            msg.activeTab === 'eligibility'
                              ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-xs font-bold">Eligibility Rule Status</span>
                        </button>
                      )}

                      {msg.hospitals?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleTabChange(msg.id, 'hospitals')}
                          className={`px-3 py-2 rounded-xl border text-center transition-all flex items-center gap-1.5 ${
                            msg.activeTab === 'hospitals'
                              ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-xs font-bold">Hospitals ({msg.hospitals.length})</span>
                        </button>
                      )}

                      {msg.cost_estimate && (
                        <button
                          type="button"
                          onClick={() => handleTabChange(msg.id, 'cost')}
                          className={`px-3 py-2 rounded-xl border text-center transition-all flex items-center gap-1.5 ${
                            msg.activeTab === 'cost'
                              ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Calculator className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-xs font-bold">Cost Estimate</span>
                        </button>
                      )}

                      {msg.schemes?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleTabChange(msg.id, 'schemes')}
                          className={`px-3 py-2 rounded-xl border text-center transition-all flex items-center gap-1.5 ${
                            msg.activeTab === 'schemes'
                              ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-xs font-bold">Scheme Coverage</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleTabChange(msg.id, 'steps')}
                        className={`px-3 py-2 rounded-xl border text-center transition-all flex items-center gap-1.5 ${
                          msg.activeTab === 'steps'
                            ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
                        <span className="text-xs font-bold">Next Steps</span>
                      </button>
                    </div>

                    {/* Active Tab Panel: MedGemma Clinical AI */}
                    {msg.activeTab === 'medical' && msg.medical_explanation && (
                      <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 space-y-3 animate-fade-in text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-teal-100">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-teal-600" />
                            <span className="font-extrabold text-slate-900">
                              Clinical Knowledge: {msg.medical_explanation.disease_or_topic}
                            </span>
                          </div>
                          {msg.medical_explanation.icd11_code && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-600 text-white">
                              ICD-11: {msg.medical_explanation.icd11_code}
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="font-bold text-slate-700 block">Etiology & Causes:</span>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">
                            {msg.medical_explanation.etiology_and_causes}
                          </p>
                        </div>

                        {msg.medical_explanation.symptoms?.emergency_red_flags?.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                            <span className="font-bold flex items-center gap-1.5 text-rose-700 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              Emergency Red Flags:
                            </span>
                            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                              {msg.medical_explanation.symptoms.emergency_red_flags.map((rf, i) => (
                                <li key={i}>{rf}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                          <span className="font-bold text-slate-700">Clinical Disclaimer: </span>
                          {msg.medical_explanation.clinical_disclaimer ||
                            'MedGemma clinical AI output is for educational/informational navigation only and does not constitute a clinical diagnosis or treatment prescription.'}
                        </div>
                      </div>
                    )}

                    {/* Active Tab Panel: Policy Clauses Cited */}
                    {msg.activeTab === 'clauses' && msg.retrieved_clauses?.length > 0 && (
                      <div className="space-y-2.5 animate-fade-in">
                        <div className="text-xs font-bold text-slate-500">
                          Retrieved IRDAI Policy Wordings & Exact Page Citations:
                        </div>
                        {msg.retrieved_clauses.map((item, idx) => {
                          const clause = item.clause || item;
                          return (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-slate-900">{clause.policy_name}</span>
                                  <span className="font-mono text-[10px] text-slate-500">UIN: {clause.uin}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono">
                                    Page #{clause.page_number}
                                  </span>
                                </div>
                                {item.similarity_score && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                                    {Math.round(item.similarity_score * 100)}% match
                                  </span>
                                )}
                              </div>
                              <p className="p-2 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-700 leading-relaxed">
                                "{clause.clause_text}"
                              </p>
                              <p className="text-[11px] text-slate-600">
                                <strong className="text-slate-800">Impact: </strong>{clause.impact_summary}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Active Tab Panel: Eligibility Evaluation */}
                    {msg.activeTab === 'eligibility' && msg.eligibility_evaluation && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">Insurance Eligibility Evaluation:</span>
                          <span className={`px-2.5 py-1 rounded-full font-bold text-xs border ${getEligibilityBadgeStyle(msg.eligibility_evaluation.status)}`}>
                            {msg.eligibility_evaluation.status}
                          </span>
                        </div>

                        <p className="text-slate-800 text-xs leading-relaxed font-medium">
                          {msg.eligibility_evaluation.rule_explanation}
                        </p>

                        {msg.eligibility_evaluation.conditions_checked && (
                          <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1 text-[11px] text-slate-600">
                            <div><strong className="text-slate-800">Policy Tenure: </strong>{msg.eligibility_evaluation.conditions_checked.policy_tenure_months || 0} months</div>
                            <div><strong className="text-slate-800">PED Declared: </strong>{msg.eligibility_evaluation.conditions_checked.has_ped ? 'Yes' : 'No'}</div>
                            {msg.eligibility_evaluation.conditions_checked.waiting_period_active && (
                              <div className="text-amber-700 font-bold">
                                ⚠ Waiting period condition currently active.
                              </div>
                            )}
                          </div>
                        )}

                        <div className="p-2.5 rounded-lg bg-slate-100 text-[10px] text-slate-500 leading-relaxed">
                          <strong>Advisory Notice: </strong>
                          {msg.eligibility_evaluation.non_guarantee_notice ||
                            'Preliminary policy wording analysis only. Does not guarantee claim approval or pre-authorization. Final adjudication is governed strictly by the insurer and TPA.'}
                        </div>
                      </div>
                    )}

                    {/* Active Tab Panel: Hospitals */}
                    {msg.activeTab === 'hospitals' && msg.hospitals?.length > 0 && (
                      <div className="space-y-3 pt-1 animate-fade-in">
                        <div className="text-xs font-bold text-slate-500">
                          Recommended accredited hospitals in {city}:
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          {msg.hospitals.map((h) => (
                            <div
                              key={h.id}
                              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-teal-400 transition-all"
                            >
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">{h.name}</h4>
                                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                    {h.category || h.hospital_type || 'Multi-Specialty'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  {h.address}
                                </p>
                                {h.est_cost && (
                                  <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                                    Indicative Cost: {h.est_cost}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => onNavigate && onNavigate('hospitals')}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-xs font-bold text-slate-700 transition-colors"
                                >
                                  View Directory
                                </button>
                                <button
                                  onClick={() => onNavigate && onNavigate('estimator')}
                                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
                                >
                                  Estimate
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Tab Panel: Cost Estimate */}
                    {msg.activeTab === 'cost' && msg.cost_estimate && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Indicative Cost Range</span>
                            <div className="text-xl font-black text-emerald-700 mt-0.5">
                              {formatINR(msg.cost_estimate.indicative_range_min)} – {formatINR(msg.cost_estimate.indicative_range_max)}
                            </div>
                          </div>
                          <button
                            onClick={() => onNavigate && onNavigate('estimator')}
                            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs"
                          >
                            Full Estimator
                          </button>
                        </div>

                        {msg.cost_estimate.breakdown && (
                          <div className="space-y-1.5 text-xs pt-2 border-t border-slate-200">
                            {Object.values(msg.cost_estimate.breakdown).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-slate-700">
                                <span className="font-medium">{item.label}</span>
                                <span className="font-bold text-slate-900">{formatINR(item.min)} – {formatINR(item.max)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Active Tab Panel: Scheme Coverage */}
                    {msg.activeTab === 'schemes' && msg.schemes?.length > 0 && (
                      <div className="space-y-2.5 animate-fade-in">
                        {msg.schemes.map((s, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-slate-900">{s.name}</span>
                              <span className="text-emerald-700 font-extrabold">{s.coverage_limit ? `Up to ${formatINR(s.coverage_limit)}` : '100% Cashless'}</span>
                            </div>
                            <p className="text-slate-600 text-[11px]">{s.status}</p>
                          </div>
                        ))}
                        <button
                          onClick={() => onNavigate && onNavigate('schemes')}
                          className="w-full py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs hover:bg-teal-100 transition-colors"
                        >
                          Check Scheme Eligibility Questionnaire →
                        </button>
                      </div>
                    )}

                    {/* Active Tab Panel: Next Steps */}
                    {msg.activeTab === 'steps' && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs animate-fade-in">
                        <div className="font-bold text-slate-900">Recommended Action Plan:</div>
                        <ul className="space-y-1.5 text-slate-700">
                          <li className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                            <span>Obtain clinical prescription & angiography recommendation from a cardiologist.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                            <span>Visit the hospital TPA / Ayushman Bharat desk 48 hours prior to planned admission.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                            <span>Save your customized healthcare plan to your browser dashboard.</span>
                          </li>
                        </ul>
                        <div className="pt-2">
                          <button
                            onClick={() => onNavigate && onNavigate('plan')}
                            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs"
                          >
                            Open My Healthcare Plan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Closing Prompt Question */}
                    <p className="text-xs text-slate-500 pt-1 italic font-medium">
                      Would you like to explore hospital options, run a customized cost estimate, or check insurance waiting periods?
                    </p>
                  </div>
                )}

                <div className={`text-[10px] text-right pt-1 ${isUser ? 'text-slate-400' : 'text-slate-400'}`}>
                  {msg.time}
                </div>
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1 font-bold text-xs shadow-xs">
                  M
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 items-center text-slate-400 text-xs py-2">
            <Bot className="w-5 h-5 text-teal-600 animate-pulse" />
            <span className="font-semibold">Querying MedGemma, WHO ICD-11, and IRDAI policy databases...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Preset Queries & Input Bar */}
      <div className="space-y-2.5 shrink-0">
        {/* Preset Prompt Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {PRESET_QUERIES.map((query, i) => (
            <button
              key={i}
              onClick={() => handleSend(query)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 text-slate-700 text-xs font-semibold whitespace-nowrap transition-all shadow-xs shrink-0"
            >
              {query.length > 55 ? query.slice(0, 52) + '...' : query}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about medical conditions, hospitals, treatment costs, or insurance policy clauses..."
            disabled={loading}
            className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2.5 p-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 4. Real LLM Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Connect Real LLM Provider</h3>
                  <p className="text-xs text-slate-500">Enable neural reasoning, conversational chat & live tool calling</p>
                </div>
              </div>
              <button
                onClick={() => { setShowConfigModal(false); setConfigError(''); setConfigSuccess(''); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveLLM} className="p-6 space-y-5 overflow-y-auto">
              {/* Provider Selection Tabs */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Select LLM Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleProviderSelect('gemini')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      selectedProvider === 'gemini'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-xs ring-1 ring-teal-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Google Gemini
                    <span className="block text-[10px] font-medium text-emerald-600 mt-0.5">Free Tier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProviderSelect('groq')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      selectedProvider === 'groq'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-xs ring-1 ring-teal-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Groq
                    <span className="block text-[10px] font-medium text-emerald-600 mt-0.5">Ultra Fast</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProviderSelect('openai')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      selectedProvider === 'openai'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-xs ring-1 ring-teal-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    OpenAI
                    <span className="block text-[10px] font-medium text-slate-400 mt-0.5">GPT-4o mini</span>
                  </button>
                </div>
              </div>

              {/* Instructions / Key Link */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1">
                {selectedProvider === 'gemini' && (
                  <>
                    <p className="font-bold text-slate-800">Get your free Google Gemini API Key:</p>
                    <p className="text-slate-600">
                      1. Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-teal-600 font-bold hover:underline inline-flex items-center gap-0.5">Google AI Studio <ExternalLink className="w-3 h-3" /></a>
                    </p>
                    <p className="text-slate-600">2. Sign in with any Google account and click <strong>Create API Key</strong>.</p>
                  </>
                )}
                {selectedProvider === 'groq' && (
                  <>
                    <p className="font-bold text-slate-800">Get your free Groq API Key:</p>
                    <p className="text-slate-600">
                      1. Visit <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-teal-600 font-bold hover:underline inline-flex items-center gap-0.5">Groq Console <ExternalLink className="w-3 h-3" /></a>
                    </p>
                    <p className="text-slate-600">2. Sign in and create a free key (starts with <code>gsk_...</code>).</p>
                  </>
                )}
                {selectedProvider === 'openai' && (
                  <>
                    <p className="font-bold text-slate-800">OpenAI API Key:</p>
                    <p className="text-slate-600">
                      Use your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-teal-600 font-bold hover:underline inline-flex items-center gap-0.5">platform.openai.com <ExternalLink className="w-3 h-3" /></a> (starts with <code>sk-...</code>).
                    </p>
                  </>
                )}
              </div>

              {/* API Key Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  {selectedProvider === 'gemini' ? 'Google Gemini API Key' : (selectedProvider === 'groq' ? 'Groq API Key' : 'OpenAI API Key')}
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={selectedProvider === 'gemini' ? 'AIzaSy...' : (selectedProvider === 'groq' ? 'gsk_...' : 'sk-...')}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Key is validated directly by backend; never saved in browser localStorage.</span>
                </p>
              </div>

              {/* Model ID Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Model ID</label>
                <input
                  type="text"
                  value={modelIdInput}
                  onChange={(e) => setModelIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {selectedProvider === 'gemini' && 'Default: gemini-2.5-flash (or gemini-1.5-flash)'}
                  {selectedProvider === 'groq' && 'Default: llama-3.3-70b-versatile (or llama-3.1-8b-instant)'}
                  {selectedProvider === 'openai' && 'Default: gpt-4o-mini (or gpt-4o)'}
                </p>
              </div>

              {/* Feedback Alerts */}
              {configError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5 break-words">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-relaxed">{configError}</span>
                </div>
              )}
              {configSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5 break-words">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="leading-relaxed">{configSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowConfigModal(false); setConfigError(''); setConfigSuccess(''); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={configLoading || !apiKeyInput.trim()}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                >
                  {configLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validating Key...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Test & Save Connection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
