import React from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function DisclaimerModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-slate-900 font-extrabold text-base sm:text-lg">
            <ShieldCheck className="w-6 h-6 text-teal-600 stroke-[2.2]" />
            <h2 id="disclaimer-title">Clinical & Educational Disclaimer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-950">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Not Medical Advice:</strong> This agent is an administrative navigation and informational cost benchmark tool. It does not provide medical diagnoses, treatment plans, or drug prescriptions.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-0.5">Academic Context & Simulation</h4>
            <p className="text-[11px]">
              This application was engineered for a college capstone project demonstrating AI agent tool-calling for healthcare navigation. All appointment booking flows are strictly simulated (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">is_simulated: true</code>) and do not reserve actual clinical slots at healthcare facilities.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-0.5">Indicative Cost Benchmarks</h4>
            <p className="text-[11px]">
              Prices shown reflect regional tertiary benchmarks. Inpatient charges vary dynamically depending on physician seniority, room category, medical comorbidities, consumable tiers, and clinical complications.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-0.5">Public Health Schemes</h4>
            <p className="text-[11px]">
              Scheme coverage rules (PM-JAY, Aarogyasri, CGHS, ESIC) are summarized from public guidelines. Actual scheme claim eligibility requires valid documentation (Aadhaar, Food Security Card, CGHS Card) verified by hospital helpdesks upon admission.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
