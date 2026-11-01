import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  HeartPulse,
  Info,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Star
} from 'lucide-react';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR, formatINRCompact } from '../utils/formatters';

export default function PlanScreen({ onNavigate }) {
  const { plan, updatePlan, toggleChecklist, resetPlan, setSelectedHospitalForBooking, setActiveHospitalDetails } = useHealthcare();
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSavePlan = () => {
    updatePlan({ savedAt: new Date().toISOString() });
    showToast("Healthcare plan saved successfully to your browser session.");
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const RECOMMENDED_HOSPITALS = [
    {
      id: "hosp-hyd-01",
      name: "Apollo Hospitals, Jubilee Hills",
      city: "Hyderabad",
      type: "Private",
      address: "Road No 72, Jubilee Hills, Hyderabad - 500033",
      estCost: "₹1.8L – ₹2.5L",
      accreditation: ["NABH", "JCI"],
      rating: 4.7,
      schemes: ["PM-JAY", "Aarogyasri"],
      phone: "+91 40 2360 7777"
    },
    {
      id: "hosp-hyd-02",
      name: "Nizam's Institute of Medical Sciences (NIMS)",
      city: "Hyderabad",
      type: "Government",
      address: "Punjagutta, Hyderabad - 500082",
      estCost: "₹1.2L – ₹1.8L",
      accreditation: ["NABH"],
      rating: 4.4,
      schemes: ["PM-JAY", "Aarogyasri", "CGHS"],
      phone: "+91 40 2348 9000"
    },
    {
      id: "hosp-hyd-03",
      name: "KIMS Hospitals, Secunderabad",
      city: "Hyderabad",
      type: "Private",
      address: "Minister Road, Begumpet, Secunderabad - 500003",
      estCost: "₹1.5L – ₹2.2L",
      accreditation: ["NABH"],
      rating: 4.5,
      schemes: ["Aarogyasri"],
      phone: "+91 40 4488 5000"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16 print:p-0">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header with Title & Action Buttons (Matching Reference Image) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              My Healthcare Plan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              A personalized summary with hospital options, estimated cost, scheme coverage and next steps.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handleSavePlan}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Plan</span>
          </button>
        </div>
      </div>

      {/* Print Document Header */}
      <div className="hidden print:block p-6 border-b border-slate-300">
        <h2 className="text-2xl font-black text-slate-900">CareNav AI — Patient Care Navigation Plan</h2>
        <p className="text-xs text-slate-600 mt-1">Generated: {new Date().toLocaleDateString()} | Regional Benchmark Summary</p>
      </div>

      {/* 2. Main Two-Column Layout (Matching Reference Image) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Plan Summary Card (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                Plan Summary
              </h2>
            </div>
            <button
              onClick={() => onNavigate('estimator')}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              Change Treatment
            </button>
          </div>

          {/* Key Value Rows */}
          <div className="space-y-4 text-xs">
            
            {/* Treatment */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 font-bold">Treatment:</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-right sm:text-sm">
                {plan.treatment}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 font-bold">Location:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {plan.city}, TS
              </span>
            </div>

            {/* Room Tier */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 font-bold">Room Category:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {plan.roomType} ({plan.stayDays} days stay)
              </span>
            </div>

            {/* Estimated Cost */}
            <div className="flex items-start justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 font-bold">Estimated Cost:</span>
              <span className="font-black text-slate-900 dark:text-white text-sm">
                {formatINR(plan.costMin)} – {formatINR(plan.costMax)}
              </span>
            </div>

            {/* Recommended Scheme */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 font-bold">Recommended Scheme:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-right">
                {plan.schemeName}
              </span>
            </div>

            {/* Potential Coverage */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 font-bold">Potential Coverage:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">
                Up to {formatINR(plan.coverageLimit)}
              </span>
            </div>

            {/* Estimated Out-of-Pocket (Highlight Box) */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                  Estimated Out-of-Pocket
                </span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                  {formatINR(plan.estimatedOutOfPocketMin)} – {formatINR(plan.estimatedOutOfPocketMax)}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-white dark:bg-slate-900 text-emerald-700 border border-emerald-300">
                Cashless Tier
              </span>
            </div>

          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] text-slate-500 leading-snug">
            * Note: Out-of-pocket costs represent non-covered medical consumables or voluntary room rent differentials under network rules.
          </div>
        </div>

        {/* Right Column: Recommended Hospitals (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                Recommended Hospitals in {plan.city}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('hospitals')}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              View Full Directory
            </button>
          </div>

          {/* Hospital Cards List (Matching Reference Image) */}
          <div className="space-y-3">
            {RECOMMENDED_HOSPITALS.map((hosp) => (
              <div
                key={hosp.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {hosp.name}
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {hosp.type}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {hosp.accreditation[0]}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {hosp.address}
                  </p>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Est. Cost:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{hosp.estCost}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-600 font-bold">{hosp.schemes.join(', ')}</span>
                  </div>
                </div>

                {/* Booking Trigger */}
                <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setSelectedHospitalForBooking(hosp)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    Book Demo
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* 3. Preparation Checklist & Next Steps */}
      <section className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-sm sm:text-base uppercase tracking-wider text-slate-900 dark:text-white">
            Patient Preparation & Empanelment Checklist
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Step 1: Identity & Card Verification */}
          <div
            onClick={() => toggleChecklist('identityVerified')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              plan.checklist?.identityVerified
                ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                Step 1
              </span>
              <input
                type="checkbox"
                checked={plan.checklist?.identityVerified || false}
                onChange={() => {}}
                className="w-4 h-4 text-emerald-600 rounded"
              />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1">
              Identity Verification
            </h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              Keep Aadhaar Card, Ayushman Card or White Ration Card ready for e-KYC.
            </p>
          </div>

          {/* Step 2: Diagnostics */}
          <div
            onClick={() => toggleChecklist('diagnosticsReady')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              plan.checklist?.diagnosticsReady
                ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                Step 2
              </span>
              <input
                type="checkbox"
                checked={plan.checklist?.diagnosticsReady || false}
                onChange={() => {}}
                className="w-4 h-4 text-emerald-600 rounded"
              />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1">
              Clinical Reports
            </h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              Gather ECG, 2D-Echo, Angiogram film and physician consultation prescription.
            </p>
          </div>

          {/* Step 3: Helpdesk Visit */}
          <div
            onClick={() => toggleChecklist('deskConsulted')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              plan.checklist?.deskConsulted
                ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                Step 3
              </span>
              <input
                type="checkbox"
                checked={plan.checklist?.deskConsulted || false}
                onChange={() => {}}
                className="w-4 h-4 text-emerald-600 rounded"
              />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1">
              Mitra Helpdesk Visit
            </h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              Visit the Ayushman Mitra or Aarogya Mithra kiosk in the hospital admission lounge.
            </p>
          </div>

          {/* Step 4: Pre-authorization */}
          <div
            onClick={() => toggleChecklist('preAuthSubmitted')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              plan.checklist?.preAuthSubmitted
                ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                Step 4
              </span>
              <input
                type="checkbox"
                checked={plan.checklist?.preAuthSubmitted || false}
                onChange={() => {}}
                className="w-4 h-4 text-emerald-600 rounded"
              />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1">
              Cashless Pre-Auth
            </h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              Hospital uploads package pre-authorization to the government insurance portal.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}

