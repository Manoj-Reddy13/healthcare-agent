import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  HelpCircle,
  Network,
  Phone,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { formatCurrency } from '../utils/formatters';

const POPULAR_HOSPITALS = [
  { id: 'hosp-hyd-01', name: 'Apollo Health City, Jubilee Hills', locality: 'Jubilee Hills, Hyderabad' },
  { id: 'hosp-hyd-02', name: 'Nizam’s Institute of Medical Sciences (NIMS)', locality: 'Punjagutta, Hyderabad' },
  { id: 'hosp-hyd-03', name: 'Care Hospitals, Banjara Hills', locality: 'Banjara Hills, Hyderabad' },
  { id: 'hosp-hyd-04', name: 'Yashoda Hospitals, Somajiguda', locality: 'Somajiguda, Hyderabad' },
  { id: 'hosp-hyd-05', name: 'KIMS Hospitals, Secunderabad', locality: 'Minister Road, Secunderabad' },
  { id: 'hosp-hyd-06', name: 'Continental Hospitals, Gachibowli', locality: 'Gachibowli, Hyderabad' }
];

const POPULAR_PROCEDURES = [
  { id: 'proc-angio', name: 'Angioplasty (PTCA with Stents)' },
  { id: 'proc-knee', name: 'Total Knee Replacement' },
  { id: 'proc-cataract', name: 'Cataract Surgery' },
  { id: 'proc-delivery', name: 'Normal Vaginal Delivery' },
  { id: 'proc-dialysis', name: 'Hemodialysis Treatment' }
];

export default function NetworkScreen({ onNavigate }) {
  const [insurers, setInsurers] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('hosp-hyd-01');
  const [selectedInsurerId, setSelectedInsurerId] = useState('ins-star');
  const [selectedProcedureId, setSelectedProcedureId] = useState('proc-angio');
  const [matchResult, setMatchResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInsurers();
    handleSearch('hosp-hyd-01', 'ins-star');
  }, []);

  const loadInsurers = async () => {
    try {
      const data = await ApiClient.fetchInsurers();
      setInsurers(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (hospId, insId) => {
    setLoading(true);
    try {
      const res = await ApiClient.matchHospitalInsuranceNetwork({
        hospital_id: hospId || selectedHospitalId,
        insurer_id: insId || selectedInsurerId,
        city: 'Hyderabad'
      });
      setMatchResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeMatch = matchResult?.matches?.[0] || null;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. Header Card (Clean Light SaaS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold mb-3 border border-teal-200">
            <Network className="w-3.5 h-3.5 text-teal-600" />
            Hospital Cashless Empanelment Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Find the Best Hospital & Insurance Match
          </h1>
          <p className="mt-2 text-slate-500 text-xs sm:text-sm leading-relaxed">
            Verify whether your private health insurer or government scheme offers guaranteed cashless admission at your preferred hospital.
            Check official TPA desk contacts, pre-authorization turnaround times, and mandatory admission documents.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => onNavigate && onNavigate('insurance')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Insurance Explorer</span>
          </button>
          <button
            onClick={() => onNavigate && onNavigate('estimator')}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <span>Estimate Out-of-Pocket</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Selector Control Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Search className="w-4 h-4 text-teal-600" />
          Select Hospital and Insurance Provider
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hospital Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Hospital
            </label>
            <select
              value={selectedHospitalId}
              onChange={(e) => {
                setSelectedHospitalId(e.target.value);
                handleSearch(e.target.value, selectedInsurerId);
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            >
              {POPULAR_HOSPITALS.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.locality})
                </option>
              ))}
            </select>
          </div>

          {/* Insurer Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Insurance Provider
            </label>
            <select
              value={selectedInsurerId}
              onChange={(e) => {
                setSelectedInsurerId(e.target.value);
                handleSearch(selectedHospitalId, e.target.value);
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            >
              {insurers.map((ins) => (
                <option key={ins.insurer_id} value={ins.insurer_id}>
                  {ins.short_name} ({ins.category})
                </option>
              ))}
            </select>
          </div>

          {/* Planned Procedure Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Planned Procedure
            </label>
            <select
              value={selectedProcedureId}
              onChange={(e) => setSelectedProcedureId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            >
              {POPULAR_PROCEDURES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Match Result Display */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs font-semibold">
          Querying hospital empanelment and insurer network registries...
        </div>
      ) : activeMatch ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Status Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full inline-flex items-center gap-1.5 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {activeMatch.match_status}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5">
                  {activeMatch.hospital_name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Empanelled with <span className="font-bold text-slate-800">{activeMatch.insurer_name}</span> for Cashless Hospitalization
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] text-slate-400 font-medium block">Verification Confidence</span>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mt-0.5">
                  {activeMatch.confidence_level}
                </span>
              </div>
            </div>

            {/* Turnaround & TPA Desk Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-teal-600" />
                  Hospital Cashless & TPA Helpdesk
                </span>
                <p className="text-sm font-black text-slate-900 pt-1">
                  {activeMatch.tpa_desk_contact || 'Main Casualty / Inpatient Desk'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Located on Ground Floor / Admission Lounge. Open 24x7 for emergencies.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Average Pre-Authorization Turnaround
                </span>
                <p className="text-sm font-black text-slate-900 pt-1">
                  ~ {activeMatch.estimated_turnaround_hours} Hours
                </p>
                <p className="text-[11px] text-slate-500">
                  Electronic Token Exchange via Insurer Portal. Emergency approval within 1 hour.
                </p>
              </div>
            </div>

            {/* Special Network Notes */}
            {activeMatch.deduction_notes && (
              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-950 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-teal-900">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Cashless Agreement Notes
                </span>
                <p className="text-teal-900 leading-relaxed font-medium">
                  {activeMatch.deduction_notes}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate && onNavigate('estimator')}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2"
              >
                <span>Estimate Out-of-Pocket for this Hospital</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate && onNavigate('hospitals')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4 text-slate-600" />
                <span>View Complete Hospital Directory</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              Source: {activeMatch.verification_source}. Last verified on {activeMatch.last_verified}.
            </p>
          </div>

          {/* Right Checklist Card (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-600" />
              Cashless Admission Checklist
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Original Government ID</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">Aadhaar Card or PAN card of patient.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Health Insurance E-Card</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">Policy number and member ID card from insurer app.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Doctor's Admission Advice</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">Prescription stating diagnosis and clinical necessity.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Initial Diagnostic Reports</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">ECG, Angiogram film, or lab work justifying treatment.</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Important Notice
              </span>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                Hospital accreditation does not automatically guarantee 100% cashless approval. Retain refundable security deposit (₹10,000 – ₹25,000) for non-payable consumables.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-600 space-y-3">
          <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
          <h4 className="font-bold text-slate-900">Direct Cashless Agreement Not Found in Current Registry</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            This hospital may still support reimbursement claims. Retain original discharge summary, consolidated final bill, and payment receipts to file directly with your insurer.
          </p>
        </div>
      )}
    </div>
  );
}
