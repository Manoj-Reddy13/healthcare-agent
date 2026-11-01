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
  Coins,
  FileCheck,
  Heart,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Minus,
  Plus,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR, formatINRCompact, getDataModeBadge } from '../utils/formatters';

const PROCEDURES = [
  { id: "proc-angio", code: "Angioplasty", name: "Angioplasty (PTCA with Stenting)", organ: "heart" },
  { id: "proc-knee", code: "Knee Replacement", name: "Total Knee Replacement (Single Joint)", organ: "joint" },
  { id: "proc-cataract", code: "Cataract Surgery", name: "Cataract Surgery (Phacoemulsification)", organ: "eye" },
  { id: "proc-delivery", code: "Normal Delivery", name: "Normal Vaginal Delivery", organ: "maternity" },
  { id: "proc-csection", code: "Cesarean Section", name: "Cesarean Section (C-Section)", organ: "maternity" },
  { id: "proc-mri", code: "MRI Scan", name: "MRI Scan (Single Region)", organ: "radiology" },
  { id: "proc-appendectomy", code: "Laparoscopic Appendectomy", name: "Laparoscopic Appendectomy", organ: "surgery" },
  { id: "proc-dialysis", code: "Hemodialysis", name: "Hemodialysis (Per Session)", organ: "kidney" }
];

const ROOM_TIERS = [
  { id: "General Ward", label: "General Ward", mult: "0.85x", desc: "Multi-bed shared recovery hall" },
  { id: "Semi-Private", label: "Semi-Private", mult: "1.0x", desc: "Dual sharing with privacy divider" },
  { id: "Single Private", label: "Private Room", mult: "1.25x", desc: "Single occupant air-conditioned room" },
  { id: "Deluxe Suite", label: "Deluxe Suite", mult: "1.6x", desc: "Executive inpatient suite" },
];

export default function EstimatorScreen({ onNavigate }) {
  const { city, updatePlan } = useHealthcare();
  const [activeTab, setActiveTab] = useState('benchmark'); // 'benchmark' | 'out_of_pocket'

  // Benchmark Estimator State
  const [selectedProcedure, setSelectedProcedure] = useState("Angioplasty");
  const [roomType, setRoomType] = useState("Single Private");
  const [stayDays, setStayDays] = useState(3);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addedToPlan, setAddedToPlan] = useState(false);

  // Out-of-Pocket Calculator State
  const [policies, setPolicies] = useState([]);
  const [oopProcedureId, setOopProcedureId] = useState("proc-angio");
  const [oopHospitalId, setOopHospitalId] = useState("hosp-hyd-01");
  const [oopRoomType, setOopRoomType] = useState("Single Private");
  const [oopPolicyId, setOopPolicyId] = useState("pol-star-comp");
  const [oopIsPed, setOopIsPed] = useState(false);
  const [oopMonthsActive, setOopMonthsActive] = useState(36);
  const [oopResult, setOopResult] = useState(null);
  const [oopLoading, setOopLoading] = useState(false);

  useEffect(() => {
    fetchCostData();
    loadPolicies();
  }, [selectedProcedure, roomType, stayDays, city]);

  const loadPolicies = async () => {
    try {
      const data = await ApiClient.fetchPolicies();
      setPolicies(data || []);
      if (data && data.length > 0) {
        setOopPolicyId(data[0].policy_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCostData = async (proc = selectedProcedure, rm = roomType, days = stayDays) => {
    setLoading(true);
    setAddedToPlan(false);
    try {
      const data = await ApiClient.estimateCost({
        procedure: proc,
        city,
        roomType: rm === "Single Private" ? "Private Room" : rm,
        stayDays: days
      });
      setEstimate(data);
    } catch (err) {
      console.error("Error fetching estimate:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateOop = async () => {
    setOopLoading(true);
    try {
      const res = await ApiClient.calculateOutOfPocket({
        procedure_id: oopProcedureId,
        hospital_id: oopHospitalId,
        room_type: oopRoomType,
        policy_id: oopPolicyId,
        is_ped: oopIsPed,
        policy_active_months: oopMonthsActive
      });
      setOopResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setOopLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'out_of_pocket' && !oopResult) {
      handleCalculateOop();
    }
  }, [activeTab]);

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

  const hospitalComparisons = [
    { name: "Apollo Hospitals, Jubilee Hills", type: "Private", min: Math.round((estimate?.indicative_range_min || 120000) * 1.15), max: Math.round((estimate?.indicative_range_max || 250000) * 1.15), schemes: "PM-JAY, Aarogyasri" },
    { name: "Nizam's Institute of Medical Sciences (NIMS)", type: "Government", min: Math.round((estimate?.indicative_range_min || 120000) * 0.55), max: Math.round((estimate?.indicative_range_max || 250000) * 0.65), schemes: "PM-JAY, Aarogyasri, CGHS" },
    { name: "KIMS Hospitals, Secunderabad", type: "Private", min: Math.round((estimate?.indicative_range_min || 120000) * 0.95), max: Math.round((estimate?.indicative_range_max || 250000) * 1.05), schemes: "Aarogyasri" }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* 1. Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shrink-0">
            <Calculator className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Treatment Cost Estimator & Out-of-Pocket Calculator
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Get verified benchmark costs for hospital treatments and calculate out-of-pocket expenses with insurance deductions.
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'benchmark'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hospital Cost Benchmark
          </button>
          <button
            onClick={() => setActiveTab('out_of_pocket')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'out_of_pocket'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Out-of-Pocket Calculator
          </button>
        </div>
      </div>

      {/* TAB 1: Benchmark Cost Estimator (Matching Screen 4 of Reference Image) */}
      {activeTab === 'benchmark' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* Left Form: Configuration Panel (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 pb-3 border-b border-slate-100">
              Configure Treatment Parameters
            </h2>

            {/* Field: Treatment / Procedure */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Treatment / Procedure
              </label>
              <select
                value={selectedProcedure}
                onChange={(e) => setSelectedProcedure(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              >
                {PROCEDURES.map((p) => (
                  <option key={p.id} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Location
              </label>
              <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>{city}, Telangana</span>
                <span className="text-[10px] text-slate-400 font-medium">Tier-1 Metro</span>
              </div>
            </div>

            {/* Field: Room Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Room Type
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
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
              <label className="text-xs font-bold text-slate-700">
                Expected Hospital Stay (days)
              </label>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                <button
                  type="button"
                  onClick={() => setStayDays(Math.max(1, stayDays - 1))}
                  className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold border border-slate-200 shadow-xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <span className="font-bold text-sm text-slate-900">
                  {stayDays} {stayDays === 1 ? 'day' : 'days'}
                </span>

                <button
                  type="button"
                  onClick={() => setStayDays(Math.min(30, stayDays + 1))}
                  className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold border border-slate-200 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Estimate Action Button */}
            <button
              onClick={() => fetchCostData()}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              <span>Estimate Cost</span>
            </button>
          </div>

          {/* Right Panel: Estimated Cost Card + Breakdown (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Main Benchmark Display Card */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              
              {/* Header: Title with Anatomical Heart Graphic */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">
                      Estimated Cost for {estimate?.procedure || selectedProcedure}
                    </h3>
                    <div className="group relative">
                      <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-64 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        Calculated from accredited hospital package rates and room tier factors.
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Includes procedure fee, {stayDays} days in {roomType}, doctor & consultation, and consumables.
                  </p>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100 shadow-sm">
                  <Heart className="w-6 h-6 fill-rose-500" />
                </div>
              </div>

              {/* Big Green Price Range Highlight */}
              <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <div className="text-2xl sm:text-4xl font-black text-emerald-700 tracking-tight">
                    {formatINR(estimate?.indicative_range_min || 120000)} – {formatINR(estimate?.indicative_range_max || 250000)}
                  </div>
                  <p className="text-xs text-emerald-800 font-semibold mt-1">
                    Indicative range in {city}
                  </p>
                </div>

                <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
                  Benchmark Midpoint: {formatINR(estimate?.average_cost || 185000)}
                </div>
              </div>

              {/* Cost Breakdown Table (Matching Reference Image) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
                  <span>Cost Breakdown (Approx.)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Component estimates</span>
                </h4>

                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
                  {estimate?.breakdown && Object.values(estimate.breakdown).map((comp, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <span className="font-medium text-slate-700">
                        {comp.label}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatINR(comp.min)} – {formatINR(comp.max)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Potential Coverage Box (Matching Reference Image) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Potential Coverage</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>PM-JAY</span>
                      <span className="text-emerald-700 font-extrabold">(Up to ₹5,00,000)</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Typically covered
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>Aarogyasri (TS)</span>
                      <span className="text-teal-700 font-extrabold">(Up to ₹10,00,000)</span>
                    </div>
                    <p className="text-[11px] text-teal-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> May be covered (Subject to eligibility)
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 max-w-sm">
                  Save this estimate and compare hospital coverage in your personal healthcare summary.
                </div>

                <button
                  onClick={handleAddToPlan}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <span>{addedToPlan ? 'Plan Updated! Navigating...' : 'Add to My Healthcare Plan'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] text-slate-400 leading-normal border-t border-slate-100 pt-3 italic">
                * Note: These are indicative costs based on available hospital package data. Actual costs may vary by hospital, patient condition, and treatment complexity.
              </p>

            </div>

          </div>

        </div>
      )}

      {/* TAB 2: Advanced Actuarial Out-of-Pocket Calculator */}
      {activeTab === 'out_of_pocket' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* Left Form: Calculator Inputs (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-600" />
              Patient & Policy Parameters
            </h2>

            {/* Procedure select */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target Procedure</label>
              <select
                value={oopProcedureId}
                onChange={(e) => setOopProcedureId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
              >
                {PROCEDURES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Hospital select */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Hospital Selection</label>
              <select
                value={oopHospitalId}
                onChange={(e) => setOopHospitalId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
              >
                <option value="hosp-hyd-01">Apollo Health City, Jubilee Hills</option>
                <option value="hosp-hyd-02">Nizam's Institute of Medical Sciences (NIMS)</option>
                <option value="hosp-hyd-03">Care Hospitals, Banjara Hills</option>
                <option value="hosp-hyd-04">Yashoda Hospitals, Somajiguda</option>
              </select>
            </div>

            {/* Room type select */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Room Category</label>
              <select
                value={oopRoomType}
                onChange={(e) => setOopRoomType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
              >
                <option value="General Ward">General Ward (No Room Rent Cap)</option>
                <option value="Semi-Private">Semi-Private Room</option>
                <option value="Single Private">Single Private A/C Room</option>
                <option value="Deluxe Suite">Deluxe Suite (Premium Upgrade)</option>
              </select>
            </div>

            {/* Health Insurance Policy Select */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Health Insurance Policy</label>
              <select
                value={oopPolicyId}
                onChange={(e) => setOopPolicyId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
              >
                {policies.map((pol) => (
                  <option key={pol.policy_id} value={pol.policy_id}>
                    {pol.insurer_name}: {pol.policy_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pre-Existing Condition Checkbox */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={oopIsPed}
                  onChange={(e) => setOopIsPed(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                Pre-Existing Condition (PED)
              </label>
              <p className="text-[10px] text-slate-500">
                Check if treatment relates to hypertension, diabetes, or earlier cardiac condition.
              </p>

              {oopIsPed && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Continuous Policy Coverage (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={oopMonthsActive}
                    onChange={(e) => setOopMonthsActive(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-bold text-slate-900"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleCalculateOop}
              disabled={oopLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {oopLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              <span>Calculate Out-of-Pocket</span>
            </button>
          </div>

          {/* Right Panel: Mathematical Deduction Steps & Out-of-Pocket Balance (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            {oopLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                Calculating actuarial deductions and policy limits...
              </div>
            ) : oopResult ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
                
                {/* Result Headline Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                      Estimated Out-of-Pocket Expense
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-emerald-800 mt-1">
                      {formatINR(oopResult.final_out_of_pocket)}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      For <span className="font-bold text-slate-800">{oopResult.procedure_name}</span> at {oopResult.hospital_name}
                    </p>
                  </div>

                  <div className="text-right space-y-1 bg-white p-3 rounded-xl border border-slate-200 self-start sm:self-auto">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Gross Hospital Bill</span>
                    <span className="text-base font-extrabold text-slate-900 block">
                      {formatINR(oopResult.gross_hospital_bill)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                      Approved Claim: {formatINR(oopResult.policy_coverage_amount)}
                    </span>
                  </div>
                </div>

                {/* Step-by-Step Bill Deduction Audit Trail */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
                    <span>Audit Trail: How Your Bill is Calculated</span>
                    <span className="text-[10px] text-slate-400 font-normal">Formula-driven</span>
                  </h4>

                  <div className="space-y-2.5">
                    {oopResult.deduction_steps?.map((step) => (
                      <div
                        key={step.step_number}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {step.step_number}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {step.title}
                            </span>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              {step.description}
                            </p>
                            {step.clause_reference && (
                              <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded mt-1 inline-block">
                                Ref: {step.clause_reference}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`font-black text-sm block ${
                            step.amount_inr < 0
                              ? 'text-emerald-700'
                              : step.category === 'deduction'
                              ? 'text-rose-600'
                              : 'text-slate-900'
                          }`}>
                            {step.amount_inr < 0 ? `- ${formatINR(Math.abs(step.amount_inr))}` : formatINR(step.amount_inr)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Insights */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 text-xs space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5 text-blue-900">
                    <FileCheck className="w-4 h-4 text-blue-700" />
                    Key Underwriting Insights & Advice
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    {oopResult.financial_insights?.map((ins, i) => (
                      <li key={i}>{ins}</li>
                    ))}
                  </ul>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  {oopResult.disclaimer}
                </p>

              </div>
            ) : null}
          </div>

        </div>
      )}

    </div>
  );
}
