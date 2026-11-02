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
  Sparkles
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
      city: plan.city || "Hyderabad",
      type: "Private Multi-Specialty",
      address: "Road No 72, Jubilee Hills, Hyderabad - 500033",
      estCost: "₹1.5L – ₹2.4L",
      accreditation: ["NABH", "JCI"],
      schemes: ["PM-JAY", "Aarogyasri"],
      phone: "+91 40 2360 7777"
    },
    {
      id: "hosp-hyd-02",
      name: "Nizam's Institute of Medical Sciences (NIMS)",
      city: plan.city || "Hyderabad",
      type: "Government Autonomous",
      address: "Punjagutta, Hyderabad - 500082",
      estCost: "₹85K – ₹1.4L",
      accreditation: ["NABH"],
      schemes: ["PM-JAY", "Aarogyasri", "CGHS"],
      phone: "+91 40 2348 9000"
    },
    {
      id: "hosp-hyd-03",
      name: "Care Hospitals, Banjara Hills",
      city: plan.city || "Hyderabad",
      type: "Private Tertiary Care",
      address: "Road No 1, Banjara Hills, Hyderabad - 500034",
      estCost: "₹1.3L – ₹2.1L",
      accreditation: ["NABH"],
      schemes: ["Aarogyasri", "Cashless Networks"],
      phone: "+91 40 6165 6565"
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

      {/* 1. Header with Title & Action Buttons (Matching Screen 6 in Reference Image) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shrink-0">
            <ClipboardList className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Healthcare Plan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              A personalized summary with hospital options, estimated cost, scheme coverage and next steps.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handleSavePlan}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save Plan</span>
          </button>
        </div>
      </div>

      {/* Print Document Header */}
      <div className="hidden print:block p-6 border-b border-slate-300">
        <h2 className="text-2xl font-black text-slate-900">CareNav AI — Patient Care Navigation Plan</h2>
        <p className="text-xs text-slate-600 mt-1">Generated: {new Date().toLocaleDateString()} | Regional Benchmark Summary</p>
      </div>

      {/* 2. Main Two-Column Layout (Matching Screen 6 in Reference Image) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Plan Summary Card (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                Plan Summary
              </h2>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('estimator')}
              className="text-xs font-bold text-teal-700 hover:underline"
            >
              Change Treatment
            </button>
          </div>

          {/* Key Value Rows */}
          <div className="space-y-3.5 text-xs">
            {/* Treatment */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 font-bold">Treatment:</span>
              <span className="font-black text-slate-900 text-right sm:text-sm">
                {plan.treatment || "Angioplasty"}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 font-bold">Location:</span>
              <span className="font-bold text-slate-800">
                {plan.city || "Hyderabad"}, TS
              </span>
            </div>

            {/* Room Tier */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 font-bold">Room Category:</span>
              <span className="font-bold text-slate-800">
                {plan.roomType || "Semi-Private"} ({plan.stayDays || 3} days stay)
              </span>
            </div>

            {/* Estimated Cost */}
            <div className="flex items-start justify-between gap-3 pt-2.5 border-t border-slate-100">
              <span className="text-slate-400 font-bold">Estimated Cost:</span>
              <span className="font-black text-slate-900 text-sm">
                {formatINR(plan.costMin || 120000)} – {formatINR(plan.costMax || 250000)}
              </span>
            </div>

            {/* Recommended Scheme */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 font-bold">Recommended Scheme:</span>
              <span className="font-black text-teal-700 text-right">
                {plan.schemeName || "PM-JAY / Aarogyasri"}
              </span>
            </div>

            {/* Potential Coverage */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 font-bold">Potential Coverage:</span>
              <span className="font-black text-emerald-700">
                Up to {formatINR(plan.coverageLimit || 500000)} (PM-JAY)
              </span>
            </div>

            {/* Estimated Out-of-Pocket (Highlight Box) */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                  Estimated Out-of-Pocket
                </span>
                <span className="text-lg font-black text-teal-900">
                  {formatINR(plan.estimatedOutOfPocketMin || 0)} – {formatINR(plan.estimatedOutOfPocketMax || 50000)}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white text-teal-800 border border-teal-200 shadow-xs">
                Cashless Tier
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-snug border border-slate-100">
            * Note: Out-of-pocket costs represent non-covered medical consumables or voluntary room rent differentials under network rules.
          </div>
        </div>

        {/* Right Column: Recommended Hospitals (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                Recommended Hospitals in {plan.city || "Hyderabad"}
              </h2>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('hospitals')}
              className="text-xs font-bold text-teal-700 hover:underline"
            >
              View Full Directory
            </button>
          </div>

          {/* Hospital Cards List (Matching Screen 6 in Reference Image) */}
          <div className="space-y-3">
            {RECOMMENDED_HOSPITALS.map((hosp) => (
              <div
                key={hosp.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-400 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                      {hosp.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      {hosp.type}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                      {hosp.accreditation[0]}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {hosp.address}
                  </p>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Est. Cost:</span>
                    <span className="font-black text-slate-800">{hosp.estCost}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-teal-700 font-bold">{hosp.schemes.join(', ')}</span>
                  </div>
                </div>

                {/* Booking Trigger */}
                <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => onNavigate && onNavigate('network')}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs transition-colors"
                  >
                    Check TPA
                  </button>
                  <button
                    onClick={() => {
                      if (setSelectedHospitalForBooking) setSelectedHospitalForBooking(hosp);
                      showToast(`Selected ${hosp.name} for your admission care plan.`);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    Select Hospital
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Preparation Checklist & Next Steps */}
      <section className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <CheckCircle2 className="w-5 h-5 text-teal-600" />
          <h2 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900">
            Patient Preparation & Empanelment Checklist
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1: Identity & Card Verification */}
          <div
            onClick={() => toggleChecklist('identityVerified')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              plan.checklist?.identityVerified
                ? 'bg-teal-50/70 border-teal-400'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-teal-800">
                Step 1
              </span>
              <input
                type="checkbox"
                checked={plan.checklist?.identityVerified || false}
                onChange={() => {}}
                className="w-4 h-4 text-teal-600 rounded"
              />
            </div>
            <h4 className="font-bold text-xs text-slate-900 mb-1">
              Identity Verification
            </h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              Keep Aadhaar Card, Ayushman Card or White Ration Card ready for e-KYC.
            </p>
          </div>

          {/* Step 2: Diagnostics */}
          <div
            onClick={() => toggleChecklist('diagnosticsReady')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              plan.checklist?.diagnosticsReady
                ? 'bg-teal-50/70 border-teal-400'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-teal-800">
                Step 2
              </span>
              <input
                type="checkbox"
                checked={plan.checklist?.diagnosticsReady || false}
                onChange={() => {}}
                className="w-4 h-4 text-teal-600 rounded"
              />
            </div>
            <h4 className="font-bold text-xs text-slate-900 mb-1">
              Clinical Reports
            </h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              Gather ECG, 2D-Echo, Angiogram film and physician consultation prescription.
            </p>
          </div>

          {/* Step 3: Helpdesk Visit */}
          <div
            onClick={() => toggleChecklist('deskConsulted')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              plan.checklist?.deskConsulted
                ? 'bg-teal-50/70 border-teal-400'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-teal-800">
                Step 3
              </span>
              <input
                type="checkbox"
                checked={plan.checklist?.deskConsulted || false}
                onChange={() => {}}
                className="w-4 h-4 text-teal-600 rounded"
              />
            </div>
            <h4 className="font-bold text-xs text-slate-900 mb-1">
              Mitra Helpdesk Visit
            </h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              Visit the Ayushman Mitra or Aarogya Mithra kiosk in the hospital admission lounge.
            </p>
          </div>

          {/* Step 4: Pre-authorization */}
          <div
            onClick={() => toggleChecklist('preAuthSubmitted')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              plan.checklist?.preAuthSubmitted
                ? 'bg-teal-50/70 border-teal-400'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-teal-800">
                Step 4
              </span>
              <input
                type="checkbox"
                checked={plan.checklist?.preAuthSubmitted || false}
                onChange={() => {}}
                className="w-4 h-4 text-teal-600 rounded"
              />
            </div>
            <h4 className="font-bold text-xs text-slate-900 mb-1">
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
