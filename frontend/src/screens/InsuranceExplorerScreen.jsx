import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  HelpCircle,
  Info,
  Loader2,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { formatCurrency } from '../utils/formatters';

const RAG_PRESET_QUERIES = [
  "Pre-existing diabetes and cardiac waiting period",
  "Specific illness 24-month waiting period for knee replacement and cataract",
  "Room rent capping and proportionate deduction penalty",
  "Co-payment percentage rules for senior citizens",
  "Non-payable surgical consumables and administrative fees"
];

const CLAUSE_CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'waiting_period', label: 'Waiting Periods' },
  { id: 'room_rent', label: 'Room Rent Capping' },
  { id: 'copay', label: 'Co-Payment' },
  { id: 'sublimit', label: 'Procedure Sublimits' },
  { id: 'exclusion', label: 'Permanent Exclusions' }
];

export default function InsuranceExplorerScreen({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('comparison'); // 'comparison' | 'clauses_rag'
  const [insurers, setInsurers] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInsurerId, setSelectedInsurerId] = useState('all');
  const [selectedPolicyIds, setSelectedPolicyIds] = useState(['pol-star-comp', 'pol-hdfc-optima']);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [selectedPolicyModal, setSelectedPolicyModal] = useState(null);

  // RAG & Clauses Intelligence State
  const [clauses, setClauses] = useState([]);
  const [clausesLoading, setClausesLoading] = useState(false);
  const [selectedClauseCategory, setSelectedClauseCategory] = useState('all');
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState(null);
  const [ragSearching, setRagSearching] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [updatingClauseId, setUpdatingClauseId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'clauses_rag') {
      loadClauses();
    }
  }, [activeTab, selectedClauseCategory, verifiedOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [insData, polData] = await Promise.all([
        ApiClient.fetchInsurers(),
        ApiClient.fetchPolicies()
      ]);
      setInsurers(insData || []);
      setPolicies(polData || []);

      // Auto-run comparison with first 2 policies
      if (polData && polData.length >= 2) {
        const initialIds = [polData[0].policy_id, polData[1].policy_id];
        setSelectedPolicyIds(initialIds);
        runComparison(initialIds);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadClauses = async () => {
    setClausesLoading(true);
    try {
      const data = await ApiClient.fetchPolicyClauses({
        category: selectedClauseCategory === 'all' ? null : selectedClauseCategory,
        verifiedOnly
      });
      setClauses(data || []);
    } catch (e) {
      console.error('Failed to load clauses:', e);
    } finally {
      setClausesLoading(false);
    }
  };

  const handleRunRAG = async (queryText) => {
    const q = queryText || ragQuery;
    if (!q || !q.trim()) return;
    setRagSearching(true);
    try {
      const results = await ApiClient.ragRetrievePolicyClauses({
        query: q,
        top_k: 5
      });
      setRagResults(results || []);
    } catch (e) {
      console.error('RAG query failed:', e);
    } finally {
      setRagSearching(false);
    }
  };

  const handleToggleVerification = async (clause) => {
    setUpdatingClauseId(clause.clause_id);
    try {
      const newStatus = !clause.is_verified;
      const res = await ApiClient.verifyPolicyClause({
        clause_id: clause.clause_id,
        is_verified: newStatus,
        verified_by: newStatus ? "Senior Medical Compliance Auditor" : "Unverified (Pending Review)"
      });

      if (res && res.clause) {
        setClauses((prev) =>
          prev.map((c) => (c.clause_id === clause.clause_id ? res.clause : c))
        );
        if (ragResults) {
          setRagResults((prev) =>
            prev.map((r) =>
              r.clause?.clause_id === clause.clause_id
                ? { ...r, clause: res.clause }
                : r
            )
          );
        }
      }
    } catch (e) {
      console.error('Verification toggle failed:', e);
    } finally {
      setUpdatingClauseId(null);
    }
  };

  const runComparison = async (ids) => {
    if (ids.length < 2) return;
    setComparing(true);
    try {
      const res = await ApiClient.comparePolicies(ids);
      setComparisonResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setComparing(false);
    }
  };

  const handleTogglePolicy = (policyId) => {
    let updated;
    if (selectedPolicyIds.includes(policyId)) {
      if (selectedPolicyIds.length <= 2) return; // Keep at least 2
      updated = selectedPolicyIds.filter((id) => id !== policyId);
    } else {
      if (selectedPolicyIds.length >= 4) return; // Max 4
      updated = [...selectedPolicyIds, policyId];
    }
    setSelectedPolicyIds(updated);
    runComparison(updated);
  };

  const filteredPolicies = policies.filter((p) => {
    if (selectedInsurerId === 'all') return true;
    return p.insurer_id === selectedInsurerId;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* 1. Header Card (Clean Light SaaS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold mb-3 border border-teal-200">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            IRDAI-Registered Products & Document Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Health Insurance Policy Intelligence
          </h1>
          <p className="mt-2 text-slate-500 text-xs sm:text-sm leading-relaxed">
            Inspect verified retail health insurance policies from leading Indian insurers. Compare exact room rent rules,
            pre-existing disease (PED) waiting periods, co-payment clauses, and search official policy document chunks with page citations via AI RAG.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => onNavigate && onNavigate('network')}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <span>Cashless Hospital Networks</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate && onNavigate('estimator')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <span>Cost Estimator</span>
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs: Comparison vs IRDAI RAG Intelligence */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs max-w-fit">
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'comparison'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Side-by-Side Policy Comparison</span>
        </button>

        <button
          onClick={() => setActiveTab('clauses_rag')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'clauses_rag'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>IRDAI Policy Document Intelligence & RAG</span>
        </button>
      </div>

      {activeTab === 'comparison' ? (
        <>
          {/* 2. Insurers Quick Strip */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Verified Indian Insurers Directory ({insurers.length})
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">IRDAI Licensed & Regulated</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {insurers.map((ins) => {
                const isSelected = selectedInsurerId === ins.insurer_id;
                return (
                  <div
                    key={ins.insurer_id}
                    onClick={() => setSelectedInsurerId(isSelected ? 'all' : ins.insurer_id)}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-500 shadow-xs ring-1 ring-teal-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-black text-slate-900 block truncate">
                      {ins.short_name}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full mt-1.5 inline-block border border-emerald-200">
                      CSR {ins.claim_settlement_ratio}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                      Reg #{ins.irda_reg_no}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Side-by-Side Comparison Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                  <Scale className="w-3.5 h-3.5 text-teal-600" />
                  Side-by-Side Policy Comparison
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2">
                  Compare Policy Clauses & Underwriting Limits
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select 2 to 4 policies to view clauses extracted directly from IRDAI Customer Information Sheets (CIS).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                  Selected: {selectedPolicyIds.length} / 4
                </span>
              </div>
            </div>

            {/* Policy Selector Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {policies.map((p) => {
                const isChecked = selectedPolicyIds.includes(p.policy_id);
                return (
                  <button
                    key={p.policy_id}
                    onClick={() => handleTogglePolicy(p.policy_id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isChecked
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isChecked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="w-3.5 h-3.5 rounded border border-slate-400 inline-block" />}
                    <span>{p.insurer_name}: {p.policy_name}</span>
                  </button>
                );
              })}
            </div>

            {/* Comparison Result */}
            {comparing ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">Updating side-by-side comparison matrix...</div>
            ) : comparisonResult ? (
              <div className="space-y-6">
                {/* Actuarial Suitability Score Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {comparisonResult.suitability?.map((s) => (
                    <div
                      key={s.policy_id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {s.policy_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {s.suitability_score}/100
                        </span>
                      </div>

                      <div className="text-[11px] font-bold text-teal-700">
                        Verdict: {s.verdict}
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-600">
                        <p className="font-bold text-slate-800">Key Strengths:</p>
                        {s.pros?.slice(0, 2).map((pro, i) => (
                          <p key={i} className="flex items-start gap-1 text-slate-600">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{pro}</span>
                          </p>
                        ))}
                      </div>

                      {s.cons?.length > 0 && (
                        <div className="space-y-1 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          <p className="font-bold">Caveat / Restriction:</p>
                          <p>{s.cons[0]}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                        <th className="p-3.5 w-1/4">Policy Clause / Feature</th>
                        {comparisonResult.policies?.map((pol) => (
                          <th key={pol.policy_id} className="p-3.5 font-black text-slate-900">
                            <div>{pol.insurer_name}</div>
                            <div className="text-[11px] font-normal text-slate-500">{pol.policy_name}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparisonResult.comparison_features?.map((row, idx) => (
                        <tr
                          key={idx}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                        >
                          <td className="p-3.5 font-bold text-slate-800 bg-slate-50/70 border-r border-slate-200">
                            {row.feature}
                          </td>
                          {comparisonResult.policies?.map((pol) => (
                            <td key={pol.policy_id} className="p-3.5 text-slate-700 leading-relaxed font-medium">
                              {row.values[pol.policy_id] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        /* ======================== TAB 2: IRDAI CLAUSE INTELLIGENCE & RAG ======================== */
        <div className="space-y-6">
          
          {/* RAG Search Engine Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  Semantic Clause Retrieval (RAG)
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1.5">
                  Search Official Policy Wordings with Exact Page Citations
                </h2>
                <p className="text-xs text-slate-500">
                  Enter natural language questions or medical treatments to retrieve verbatim clauses from filed IRDAI policy documents.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                  />
                  <span>Verified Clauses Only</span>
                </label>
              </div>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunRAG()}
                  placeholder="e.g. Pre-existing disease waiting period, room rent proportionate deduction, cataract limit..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                />
              </div>
              <button
                onClick={() => handleRunRAG()}
                disabled={ragSearching || !ragQuery.trim()}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {ragSearching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Retrieve Clauses</span>
                  </>
                )}
              </button>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Suggested Inquiries:</span>
              {RAG_PRESET_QUERIES.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setRagQuery(preset);
                    handleRunRAG(preset);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 font-medium transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* RAG Results Display */}
            {ragResults && (
              <div className="space-y-3 pt-4 border-t border-slate-100 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900">
                    Retrieved Top-{ragResults.length} Relevant Policy Clauses:
                  </span>
                  <span className="text-slate-400">Cosine Similarity Semantic Match</span>
                </div>

                <div className="space-y-3">
                  {ragResults.map((item, idx) => {
                    const clause = item.clause;
                    if (!clause) return null;
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-teal-200/80 bg-teal-50/20 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-900">
                                {clause.policy_name}
                              </span>
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                UIN: {clause.uin}
                              </span>
                              <span className="text-[10px] font-bold bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">
                                {clause.section_reference}
                              </span>
                              <span className="text-[10px] font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md">
                                Page #{clause.page_number}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-teal-800 mt-1">
                              {clause.clause_title}
                            </h4>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              {Math.round((item.similarity_score || 0.85) * 100)}% Match
                            </span>
                          </div>
                        </div>

                        {/* Verbatim Clause Text */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono">
                          "{clause.clause_text}"
                        </div>

                        {/* Impact Summary */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                          <p className="text-slate-600 text-[11px]">
                            <strong className="text-slate-800">Impact Analysis: </strong>
                            {clause.impact_summary}
                          </p>

                          <div className="flex items-center gap-2 shrink-0">
                            {clause.source_document_url && (
                              <a
                                href={clause.source_document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1"
                              >
                                <span>PDF Page {clause.page_number}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              onClick={() => handleToggleVerification(clause)}
                              disabled={updatingClauseId === clause.clause_id}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                                clause.is_verified
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {clause.is_verified ? '✓ Verified Clause' : 'Pending Verification'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Full Extracted Clauses Directory & Admin Verification */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Extracted Clauses Registry ({clauses.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Clauses parsed from official policy PDFs, with exact section references and page citations.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {CLAUSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedClauseCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedClauseCategory === cat.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clauses List */}
            {clausesLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading clauses...</div>
            ) : clauses.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No clauses found for the selected category.</div>
            ) : (
              <div className="space-y-3">
                {clauses.map((c) => (
                  <div
                    key={c.clause_id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 space-y-2 text-xs transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900">{c.policy_name}</span>
                          <span className="font-mono text-[10px] text-slate-500">UIN: {c.uin}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            Page {c.page_number}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {c.section_reference}
                          </span>
                        </div>
                        <h4 className="font-bold text-teal-800 text-xs mt-1">{c.clause_title}</h4>
                      </div>

                      <button
                        onClick={() => handleToggleVerification(c)}
                        disabled={updatingClauseId === c.clause_id}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                          c.is_verified
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {c.is_verified ? '✓ Verified by Compliance' : 'Pending Verification'}
                      </button>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                      "{c.clause_text}"
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                      <div>
                        <strong className="text-slate-700">Impact: </strong> {c.impact_summary}
                      </div>
                      {c.source_document_url && (
                        <a
                          href={c.source_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-teal-600 hover:text-teal-800 inline-flex items-center gap-1 shrink-0"
                        >
                          <span>{c.source_document}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Policy Detail Modal */}
      {selectedPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  {selectedPolicyModal.insurer_name}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {selectedPolicyModal.policy_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  IRDAI Registered UIN: {selectedPolicyModal.uin}
                </p>
              </div>
              <button
                onClick={() => setSelectedPolicyModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-teal-900">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Room Rent & ICU Capping Guidelines
                </span>
                <p className="text-slate-700 leading-relaxed">{selectedPolicyModal.room_rent_capping_notes}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block">Pre-Existing Disease Waiting</span>
                  <p className="text-slate-600 mt-0.5 font-semibold">{selectedPolicyModal.ped_waiting_period_months} Months</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block">Specific Illness Waiting</span>
                  <p className="text-slate-600 mt-0.5 font-semibold">{selectedPolicyModal.specific_disease_waiting_period_months} Months</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">Co-Payment Rules</span>
                <p className="text-slate-600 mt-0.5 leading-relaxed">{selectedPolicyModal.copay_notes}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">Restoration & Cumulative Bonus</span>
                <p className="text-slate-600 mt-0.5 leading-relaxed">{selectedPolicyModal.restoration_benefit}</p>
                <p className="text-slate-600 mt-1 leading-relaxed">{selectedPolicyModal.no_claim_bonus}</p>
              </div>

              {selectedPolicyModal.exclusions?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Key Policy Exclusions
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    {selectedPolicyModal.exclusions.map((exc, i) => (
                      <li key={i}>{exc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {selectedPolicyModal.policy_document_url ? (
                <a
                  href={selectedPolicyModal.policy_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  Official Policy Wording PDF
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : <div />}

              <button
                onClick={() => setSelectedPolicyModal(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
