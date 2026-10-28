import React, { useState, useEffect } from 'react';
import { AlertCircle, Calculator, CheckCircle2, ChevronRight, HelpCircle, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { ApiClient } from '../api/client';
import { formatINR, getDataModeBadge } from '../utils/formatters';

const PRESET_PROCEDURES = [
  "Angioplasty",
  "Knee Replacement",
  "Cataract Surgery",
  "Normal Delivery",
  "MRI Scan",
  "Doctor Consultation"
];

const ROOM_OPTIONS = [
  { id: "General Ward", label: "General Ward", multiplier: "0.85x", desc: "Multi-bed shared room" },
  { id: "Semi-Private", label: "Semi-Private", multiplier: "1.0x", desc: "Dual sharing with curtain divider" },
  { id: "Private Room", label: "Private Room", multiplier: "1.25x", desc: "Single occupant private room" },
  { id: "ICU", label: "ICU / CCU", multiplier: "1.6x", desc: "Critical care monitoring" },
];

export default function CostEstimator({ initialProcedure = "Angioplasty" }) {
  const [procedure, setProcedure] = useState(initialProcedure);
  const [city, setCity] = useState("Hyderabad");
  const [roomType, setRoomType] = useState("Semi-Private");
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchEstimate = async (proc, ct, rm) => {
    setLoading(true);
    try {
      const data = await ApiClient.estimateCost({
        procedure: proc,
        city: ct,
        roomType: rm
      });
      setEstimate(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimate(procedure, city, roomType);
  }, [procedure, city, roomType]);

  const badge = getDataModeBadge(estimate?.data_mode || "estimated");

  return (
    <div className="space-y-6">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-semibold uppercase tracking-wider">
          <Calculator className="w-4 h-4" />
          <span>Indicative Healthcare Cost Benchmark</span>
        </div>
        <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
          Compare Treatment Expenses & Room Tiers
        </h2>
        <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
          Transparent, data-backed indicative benchmark rates for tertiary treatments across metropolitan healthcare hubs. Explore potential scheme coverage and cost-influencing medical variables.
        </p>
      </div>

      {/* Main Grid: Inputs & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Configure Estimation Parameters
            </h3>

            {/* Quick Procedure Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Common Procedures
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PROCEDURES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProcedure(p)}
                    className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                      procedure.toLowerCase() === p.toLowerCase()
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Procedure Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selected Medical Procedure
              </label>
              <input
                type="text"
                value={procedure}
                onChange={(e) => setProcedure(e.target.value)}
                placeholder="e.g. Angioplasty, Knee Replacement..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* City Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Metro City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Hyderabad">Hyderabad (Telangana)</option>
                <option value="Bengaluru">Bengaluru (Karnataka)</option>
              </select>
            </div>

            {/* Room Tier Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Room Category & Tier
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROOM_OPTIONS.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setRoomType(room.id)}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      roomType === room.id
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">{room.label}</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                        {room.multiplier}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{room.desc}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 space-y-5">
          {estimate && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              
              {/* Header result */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-500">{estimate.city} • {estimate.room_type}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {estimate.procedure}
                  </h3>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Average Benchmark</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatINR(estimate.average_cost)}
                  </div>
                </div>
              </div>

              {/* Indicative Range Card */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/60 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Estimated Benchmark Range
                  </span>
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    {formatINR(estimate.indicative_range_min)} – {formatINR(estimate.indicative_range_max)}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Calculated with room tier multiplier factor ({estimate.room_multiplier}x)
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl shadow-xs border border-emerald-200 dark:border-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Metro Benchmark</span>
                </div>
              </div>

              {/* Key Influencing Factors */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                  Key Variables That Alter Final Hospital Invoices
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {estimate.factors?.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-700 dark:text-slate-300 leading-snug">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Covered Schemes */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Potentially Covering Schemes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {estimate.covered_under_schemes?.map((scheme) => (
                    <span
                      key={scheme}
                      className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {scheme}
                    </span>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                <span>{estimate.disclaimer}</span>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
