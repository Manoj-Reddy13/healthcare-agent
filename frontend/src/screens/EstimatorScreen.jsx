import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Heart,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR, formatINRCompact, getDataModeBadge } from '../utils/formatters';

const PROCEDURES = [
  { id: "Angioplasty", name: "Angioplasty (PTCA with Stenting)", organ: "heart" },
  { id: "Knee Replacement", name: "Total Knee Replacement (Single Joint)", organ: "joint" },
  { id: "Cataract Surgery", name: "Cataract Surgery (Phacoemulsification)", organ: "eye" },
  { id: "Normal Delivery", name: "Normal Vaginal Delivery", organ: "maternity" },
  { id: "Cesarean Section", name: "Cesarean Section (C-Section)", organ: "maternity" },
  { id: "MRI Scan", name: "MRI Scan (Single Region)", organ: "radiology" },
  { id: "CT Scan", name: "CT Scan (Brain / Chest)", organ: "radiology" },
  { id: "Laparoscopic Appendectomy", name: "Laparoscopic Appendectomy", organ: "surgery" },
  { id: "Hemodialysis", name: "Hemodialysis (Per Session)", organ: "kidney" },
  { id: "Senior Consultation", name: "Senior Specialist Consultation", organ: "general" }
];

const ROOM_TIERS = [
  { id: "General Ward", label: "General Ward", mult: "0.85x", desc: "Multi-bed shared recovery hall" },
  { id: "Semi-Private", label: "Semi-Private", mult: "1.0x", desc: "Dual sharing with privacy divider" },
  { id: "Private Room", label: "Private Room", mult: "1.25x", desc: "Single occupant air-conditioned room" },
  { id: "ICU", label: "ICU / CCU", mult: "1.6x", desc: "Intensive 24/7 cardiac/critical care" },
];

export default function EstimatorScreen({ onNavigate }) {
  const { city, updatePlan } = useHealthcare();
  const [selectedProcedure, setSelectedProcedure] = useState("Angioplasty");
  const [roomType, setRoomType] = useState("Private Room");
  const [stayDays, setStayDays] = useState(3);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addedToPlan, setAddedToPlan] = useState(false);

  const fetchCostData = async (proc = selectedProcedure, rm = roomType, days = stayDays) => {
    setLoading(true);
    setAddedToPlan(false);
    try {
      const data = await ApiClient.estimateCost({
        procedure: proc,
        city,
        roomType: rm,
        stayDays: days
      });
      setEstimate(data);
    } catch (err) {
      console.error("Error fetching estimate:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostData();
  }, [selectedProcedure, roomType, stayDays, city]);

  const handleAddToPlan = () => {
    if (!estimate) return;
    updatePlan({
      treatment: estimate.procedure,
      procedureId: selectedProcedure,
      roomType,
      stayDays,
      costMin: estimate.indicative_range_min,
      costMax: estimate.indicative_range_max,
      averageCost: estimate.average_cost
    });
    setAddedToPlan(true);
    setTimeout(() => {
      onNavigate('plan');
    }, 600);
  };

  const badge = getDataModeBadge(estimate?.data_mode || "estimated");

  // Hospital Comparison Benchmarks for this procedure
  const hospitalComparisons = [
    { name: "Apollo Hospitals, Jubilee Hills", type: "Private", min: Math.round((estimate?.indicative_range_min || 120000) * 1.15), max: Math.round((estimate?.indicative_range_max || 250000) * 1.15), schemes: "PM-JAY, Aarogyasri" },
    { name: "Nizam's Institute of Medical Sciences (NIMS)", type: "Government", min: Math.round((estimate?.indicative_range_min || 120000) * 0.55), max: Math.round((estimate?.indicative_range_max || 250000) * 0.65), schemes: "PM-JAY, Aarogyasri, CGHS" },
    { name: "KIMS Hospitals, Secunderabad", type: "Private", min: Math.round((estimate?.indicative_range_min || 120000) * 0.95), max: Math.round((estimate?.indicative_range_max || 250000) * 1.05), schemes: "Aarogyasri" }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* 1. Header with Title & Subtitle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Treatment Cost Estimator
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Get an indicative cost range for treatments and compare across hospitals in {city}.
            </p>
          </div>
        </div>

        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* 2. Main Two-Column Layout (Matching Reference Image) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form: Configuration Panel (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            Configure Treatment Parameters
          </h2>

          {/* Field: Treatment / Procedure */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Treatment / Procedure
            </label>
            <select
              value={selectedProcedure}
              onChange={(e) => setSelectedProcedure(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {PROCEDURES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Field: Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Location
            </label>
            <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{city}, Telangana</span>
              <span className="text-[10px] text-slate-400">Metro Tier-1</span>
            </div>
          </div>

          {/* Field: Room Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Room Type
            </label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {ROOM_TIERS.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.label} ({rm.mult})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400">
              {ROOM_TIERS.find(r => r.id === roomType)?.desc}
            </p>
          </div>

          {/* Field: Expected Hospital Stay (days) Counter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Expected Hospital Stay (days)
            </label>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5">
              <button
                type="button"
                onClick={() => setStayDays(Math.max(1, stayDays - 1))}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-100 font-bold border border-slate-200 dark:border-slate-600 shadow-xs"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {stayDays} {stayDays === 1 ? 'day' : 'days'}
              </span>

              <button
                type="button"
                onClick={() => setStayDays(Math.min(30, stayDays + 1))}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-100 font-bold border border-slate-200 dark:border-slate-600 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Estimate Primary Action Button */}
          <button
            onClick={() => fetchCostData()}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-600/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            <span>Calculate Estimate</span>
          </button>
        </div>

        {/* Right Panel: Estimated Cost Card + Breakdown (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Benchmark Display Card */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            {/* Header: Title with Anatomical Graphic */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Estimated Cost for {estimate?.procedure || selectedProcedure}
                  </h3>
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-64 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      Calculated from accredited hospital package rates and room tier factors.
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Includes procedure fee, {stayDays} days in {roomType}, surgeon consultation, and consumables.
                </p>
              </div>

              {/* Heart/Organ Graphic */}
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900 shadow-sm">
                <Heart className="w-6 h-6 fill-rose-500" />
              </div>
            </div>

            {/* Big Green Price Range Highlight */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <div className="text-2xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                  {formatINR(estimate?.indicative_range_min || 120000)} – {formatINR(estimate?.indicative_range_max || 250000)}
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold mt-1">
                  Indicative benchmark range in {city} ({roomType})
                </p>
              </div>

              <div className="text-xs font-bold text-slate-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
                Midpoint: {formatINR(estimate?.average_cost || 185000)}
              </div>
            </div>

            {/* Cost Breakdown Table (Matching Reference Image) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center justify-between">
                <span>Cost Breakdown (Approx.)</span>
                <span className="text-[10px] text-slate-400 font-normal">Component estimates</span>
              </h4>

              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden text-xs">
                {estimate?.breakdown && Object.values(estimate.breakdown).map((comp, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {comp.label}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatINR(comp.min)} – {formatINR(comp.max)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Potential Coverage Box (Matching Reference Image) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Potential Scheme Coverage</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>PM-JAY</span>
                    <span className="text-emerald-600 font-extrabold">Up to ₹5,00,000</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Typically covered for eligible families
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>Aarogyasri (TS)</span>
                    <span className="text-emerald-600 font-extrabold">Up to ₹10,00,000</span>
                  </div>
                  <p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Covered (White ration card holders)
                  </p>
                </div>

              </div>
            </div>

            {/* Hospital-by-Hospital Cost Comparison */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Hospital Cost Comparison for {selectedProcedure}
              </h4>

              <div className="space-y-2">
                {hospitalComparisons.map((hc) => (
                  <div
                    key={hc.name}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{hc.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {hc.type}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">Accepted: {hc.schemes}</span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {formatINRCompact(hc.min)} – {formatINRCompact(hc.max)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar: Add to My Healthcare Plan */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 max-w-sm">
                Save this estimate and compare hospital coverage in your personal healthcare summary.
              </div>

              <button
                onClick={handleAddToPlan}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/30"
              >
                <span>{addedToPlan ? 'Plan Updated! Navigating...' : 'Add to My Healthcare Plan'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Regulatory Disclaimer */}
            <p className="text-[10px] text-slate-400 leading-normal border-t border-slate-100 dark:border-slate-800 pt-3">
              * Note: These are indicative regional costs based on tertiary hospital package guidelines. Actual costs vary by physician seniority, consumable tiers, patient comorbidity management, and post-op complications.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

