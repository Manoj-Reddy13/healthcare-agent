import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  Info,
  Scale,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { formatCurrency } from '../utils/formatters';

export default function InsuranceExplorerScreen({ onNavigate }) {
  const [insurers, setInsurers] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInsurerId, setSelectedInsurerId] = useState('all');
  const [selectedPolicyIds, setSelectedPolicyIds] = useState(['pol-star-comp', 'pol-hdfc-optima']);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [selectedPolicyModal, setSelectedPolicyModal] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

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
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-blue-800/40">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            IRDAI-Registered Products & Wordings Database
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Indian Health Insurance Policy Explorer
          </h1>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Inspect verified retail health insurance policies from leading Indian insurers. Compare exact room rent rules,
            pre-existing disease (PED) waiting periods, co-payment clauses, restoration benefits, and underwriting terms with zero fake statistics.
          </p>
        </div>
      </div>

      {/* Insurers Quick Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Verified Indian Insurers Directory ({insurers.length})
          </h3>
          <span className="text-xs text-slate-400">IRDAI Licensed & Regulated</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {insurers.map((ins) => (
            <div
              key={ins.insurer_id}
              onClick={() => setSelectedInsurerId(selectedInsurerId === ins.insurer_id ? 'all' : ins.insurer_id)}
              className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                selectedInsurerId === ins.insurer_id
                  ? 'bg-blue-50 border-blue-600 shadow-sm ring-1 ring-blue-600'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs font-extrabold text-slate-900 block truncate">
                {ins.short_name}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                CSR {ins.claim_settlement_ratio}
              </span>
              <span className="text-[9px] text-slate-400 block mt-1">
                Reg #{ins.irda_reg_no}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-bold">
              <Scale className="w-3.5 h-3.5" />
              Side-by-Side Product Benchmark
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              Compare Policy Clauses & Underwriting Limits
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select 2 to 4 policies to view clauses extracted directly from IRDAI Customer Information Sheets (CIS).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Selected: {selectedPolicyIds.length} / 4</span>
            <button
              onClick={() => onNavigate && onNavigate('network')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            >
              Check Cashless Hospitals <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Policy Selector Checkboxes */}
        <div className="flex flex-wrap gap-2 pt-1">
          {policies.map((p) => {
            const isChecked = selectedPolicyIds.includes(p.policy_id);
            return (
              <button
                key={p.policy_id}
                onClick={() => handleTogglePolicy(p.policy_id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isChecked
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isChecked ? <Check className="w-3 h-3 stroke-[3]" /> : <span className="w-3 h-3 rounded border border-slate-400 inline-block" />}
                {p.insurer_name}: {p.policy_name}
              </button>
            );
          })}
        </div>

        {/* Comparison Table / Matrix */}
        {comparing ? (
          <div className="py-12 text-center text-slate-400">Updating side-by-side comparison matrix...</div>
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
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {s.policy_name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-100 text-emerald-800">
                      {s.suitability_score}/100
                    </span>
                  </div>

                  <div className="text-[11px] font-semibold text-blue-700">
                    Verdict: {s.verdict}
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    <p className="font-semibold text-slate-800">Key Strengths:</p>
                    {s.pros?.slice(0, 2).map((pro, i) => (
                      <p key={i} className="flex items-start gap-1 text-slate-600">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{pro}</span>
                      </p>
                    ))}
                  </div>

                  {s.cons?.length > 0 && (
                    <div className="space-y-1 text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-100">
                      <p className="font-semibold">Caveat / Restriction:</p>
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
                      <th key={pol.policy_id} className="p-3.5 font-extrabold text-slate-900">
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
                        <td key={pol.policy_id} className="p-3.5 text-slate-700 leading-relaxed">
                          {row.values[pol.policy_id] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              {comparisonResult.disclaimer}
            </p>
          </div>
        ) : null}
      </div>

      {/* Policy Catalog Directory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Health Insurance Policies Catalog ({filteredPolicies.length})
          </h3>
          <span className="text-xs text-slate-500">
            Click any card to inspect full exclusions, waiting periods, and room rent terms
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPolicies.map((pol) => (
            <div
              key={pol.policy_id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {pol.insurer_name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    UIN: {pol.uin}
                  </span>
                </div>

                <h4 className="font-extrabold text-slate-900 text-base mt-2">
                  {pol.policy_name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type: {pol.policy_type} • Ages {pol.min_entry_age} to {pol.max_entry_age} yrs
                </p>

                {/* Highlights Grid */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-2 rounded bg-slate-50">
                    <span className="text-[10px] text-slate-400 block font-medium">Room Rent Limit</span>
                    <span className="font-bold text-slate-800 text-[11px] truncate block">
                      {pol.room_rent_limit}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50">
                    <span className="text-[10px] text-slate-400 block font-medium">PED Waiting Period</span>
                    <span className="font-bold text-slate-800 text-[11px]">
                      {pol.ped_waiting_period_months} Months
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50">
                    <span className="text-[10px] text-slate-400 block font-medium">Co-Payment</span>
                    <span className="font-bold text-slate-800 text-[11px]">
                      {pol.copay_percentage === 0 ? '0% Co-Pay' : `${pol.copay_percentage}% Mandatory`}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50">
                    <span className="text-[10px] text-slate-400 block font-medium">Restoration</span>
                    <span className="font-bold text-slate-800 text-[11px] truncate block">
                      100% Recharge
                    </span>
                  </div>
                </div>

                {/* Sum insured options */}
                <div className="mt-3">
                  <span className="text-[10px] text-slate-400 block font-medium mb-1">Sum Insured Options:</span>
                  <div className="flex flex-wrap gap-1">
                    {pol.sum_insured_options?.slice(0, 4).map((si, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {formatCurrency(si)}
                      </span>
                    ))}
                    {pol.sum_insured_options?.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                        +{pol.sum_insured_options.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setSelectedPolicyModal(pol)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                >
                  View Details & Clauses <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onNavigate && onNavigate('estimator')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Calculate Out-of-Pocket
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Single Policy Detail Modal */}
      {selectedPolicyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedPolicyModal.insurer_name}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedPolicyModal.policy_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  IRDAI Registered UIN: {selectedPolicyModal.uin}
                </p>
              </div>
              <button
                onClick={() => setSelectedPolicyModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  Room Rent & ICU Capping Guidelines
                </span>
                <p className="text-slate-700">{selectedPolicyModal.room_rent_capping_notes}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block">Pre-Existing Disease Waiting</span>
                  <p className="text-slate-600 mt-0.5">{selectedPolicyModal.ped_waiting_period_months} Months</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block">Specific Illness Waiting</span>
                  <p className="text-slate-600 mt-0.5">{selectedPolicyModal.specific_disease_waiting_period_months} Months</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">Co-Payment Rules</span>
                <p className="text-slate-600 mt-0.5">{selectedPolicyModal.copay_notes}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">Restoration & Cumulative Bonus</span>
                <p className="text-slate-600 mt-0.5">{selectedPolicyModal.restoration_benefit}</p>
                <p className="text-slate-600 mt-1">{selectedPolicyModal.no_claim_bonus}</p>
              </div>

              {selectedPolicyModal.exclusions?.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Key Policy Exclusions
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                    {selectedPolicyModal.exclusions.map((exc, i) => (
                      <li key={i}>{exc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {selectedPolicyModal.policy_document_url ? (
                <a
                  href={selectedPolicyModal.policy_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  Official Policy Wording PDF
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : <div />}

              <button
                onClick={() => setSelectedPolicyModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
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
