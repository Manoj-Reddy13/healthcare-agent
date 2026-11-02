import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR } from '../utils/formatters';

export default function EligibilityModal() {
  const { eligibilityModalScheme, setEligibilityModalScheme, updatePlan } = useHealthcare();

  const [formData, setFormData] = useState({
    age: '45',
    residentState: 'Telangana',
    hasRationCard: true,
    annualIncome: '250000'
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!eligibilityModalScheme) return null;

  const scheme = eligibilityModalScheme;

  const handleEvaluate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await ApiClient.checkSchemeEligibility(scheme.id || 'scheme-pmjay', {
        age: parseInt(formData.age, 10),
        has_ration_card: formData.hasRationCard,
        annual_income: parseFloat(formData.annualIncome)
      });
      setResult(res);

      if (res.status === 'eligible') {
        updatePlan({
          coverageLimit: res.coverage_limit || 500000,
          schemeName: scheme.name
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEligibilityModalScheme(null);
    setResult(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold border border-teal-200">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Eligibility Assessment
              </h2>
              <p className="text-xs text-slate-500">{scheme.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Form */}
        {!result ? (
          <form onSubmit={handleEvaluate} className="space-y-4 text-xs">
            {/* Age Question */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                Patient Age (Years)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
              <p className="text-[10px] text-slate-400">
                * Note: Seniors aged 70+ receive universal PM-JAY coverage regardless of income.
              </p>
            </div>

            {/* Resident State */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                State of Domicile
              </label>
              <select
                value={formData.residentState}
                onChange={(e) => setFormData({ ...formData, residentState: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              >
                <option value="Telangana">Telangana</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Other">Other State</option>
              </select>
            </div>

            {/* Food Security / White Ration Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">
                  Holds Food Security / White Ration Card?
                </span>
                <span className="text-[10px] text-slate-400">
                  Key prerequisite for state scheme (Aarogyasri / Chiranjeevi) cashless benefits
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.hasRationCard}
                onChange={(e) => setFormData({ ...formData, hasRationCard: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded"
              />
            </div>

            {/* Annual Income */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                Annual Family Income (INR)
              </label>
              <select
                value={formData.annualIncome}
                onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              >
                <option value="150000">Below ₹1,50,000 (BPL Priority)</option>
                <option value="250000">₹1,50,000 – ₹2,50,000 (Low Income)</option>
                <option value="500000">₹2,50,000 – ₹5,00,000 (State Scheme Threshold)</option>
                <option value="1000000">Above ₹5,00,000</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Evaluate Guidelines</span>
              </button>
            </div>
          </form>
        ) : (
          /* Result Display */
          <div className="space-y-4 text-xs">
            <div className={`p-4 rounded-xl border space-y-2 ${
              result.status === 'eligible'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.status === 'eligible' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-900 font-extrabold">Eligible for Cashless Coverage</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span className="text-amber-900 font-extrabold">Requires Manual Verification</span>
                  </>
                )}
              </div>

              <p className="leading-relaxed text-[11px] font-medium text-slate-700">
                {result.reason}
              </p>

              {result.coverage_limit && (
                <div className="font-bold text-xs pt-1 text-slate-900">
                  Applicable Limit: <span className="text-emerald-700 font-black">{formatINR(result.coverage_limit)}</span> per family/year
                </div>
              )}
            </div>

            {/* Next Action Steps */}
            {result.next_steps && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Recommended Next Steps
                </h4>
                <div className="space-y-1.5">
                  {result.next_steps.map((st, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-slate-700 text-[11px] font-medium">{st}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setResult(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 text-slate-700"
              >
                Re-assess
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
