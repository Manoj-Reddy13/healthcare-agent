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
  const isPMJAY = scheme.short_code === 'PM-JAY' || scheme.id === 'scheme-pmjay';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Eligibility Assessment
              </h2>
              <p className="text-xs text-slate-400">{scheme.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Form */}
        {!result ? (
          <form onSubmit={handleEvaluate} className="space-y-4 text-xs">
            
            {/* Age Question */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Patient Age (Years)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="text-[10px] text-slate-400">
                * Note: Seniors aged 70+ receive universal PM-JAY coverage regardless of income.
              </p>
            </div>

            {/* Resident State */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                State of Domicile
              </label>
              <select
                value={formData.residentState}
                onChange={(e) => setFormData({ ...formData, residentState: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Telangana">Telangana</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Other">Other State</option>
              </select>
            </div>

            {/* Food Security / White Ration Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Holds Food Security / White Ration Card?
                </span>
                <span className="text-[10px] text-slate-400">
                  Key prerequisite for state scheme (Aarogyasri) cashless benefits
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.hasRationCard}
                onChange={(e) => setFormData({ ...formData, hasRationCard: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
            </div>

            {/* Annual Income */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Annual Family Income (INR)
              </label>
              <select
                value={formData.annualIncome}
                onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="150000">Below ₹1,50,000 (BPL Priority)</option>
                <option value="250000">₹1,50,000 – ₹2,50,000 (Low Income)</option>
                <option value="500000">₹2,50,000 – ₹5,00,000 (Aarogyasri Threshold)</option>
                <option value="1000000">Above ₹5,00,000</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Evaluate Guidelines</span>
              </button>
            </div>
          </form>
        ) : (
          /* Result Display */
          <div className="space-y-4 text-xs">
            <div className={`p-4 rounded-2xl border space-y-2 ${
              result.status === 'eligible'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.status === 'eligible' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Eligible for Cashless Coverage</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span>Requires Manual Verification</span>
                  </>
                )}
              </div>

              <p className="leading-relaxed text-[11px] font-medium">
                {result.reason}
              </p>

              {result.coverage_limit && (
                <div className="font-bold text-xs pt-1">
                  Applicable Limit: {formatINR(result.coverage_limit)} per family/year
                </div>
              )}
            </div>

            {/* Next Action Steps */}
            {result.next_steps && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Recommended Next Steps
                </h4>
                <div className="space-y-1.5">
                  {result.next_steps.map((st, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 text-[11px]">{st}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setResult(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Re-assess
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
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

