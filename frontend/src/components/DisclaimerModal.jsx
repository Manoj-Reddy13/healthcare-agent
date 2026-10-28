import React from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function DisclaimerModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h2 id="disclaimer-title">Clinical & Educational Disclaimer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
              <strong>Not Medical Advice:</strong> This agent is an administrative navigation and informational cost benchmark tool. It does not provide medical diagnoses, treatment plans, or drug prescriptions.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Academic Context & Simulation</h4>
            <p>
              This application was engineered for a college capstone project demonstrating AI agent tool-calling for healthcare navigation. All appointment booking flows are strictly simulated (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">is_simulated: true</code>) and do not reserve actual clinical slots at healthcare facilities.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Indicative Cost Benchmarks</h4>
            <p>
              Prices shown reflect regional tertiary benchmarks. Inpatient charges vary dynamically depending on physician seniority, room category, medical comorbidities, consumable tiers, and clinical complications.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Public Health Schemes</h4>
            <p>
              Scheme coverage rules (PM-JAY, Aarogyasri, CGHS, ESIC) are summarized from public guidelines. Actual scheme claim eligibility requires valid documentation (Aadhaar, Food Security Card, CGHS Card) verified by hospital helpdesks upon admission.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
