import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  HeartPulse,
  Info,
  Layers,
  Search,
  Shield,
  Stethoscope,
  Tag
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { formatCurrency } from '../utils/formatters';

const SPECIALTY_PILLS = [
  'All Specialties',
  'Cardiology',
  'Orthopedics',
  'Oncology',
  'Nephrology',
  'Neurology',
  'Ophthalmology',
  'Obstetrics & Gynecology',
  'General Surgery'
];

export default function DiseaseExplorerScreen({ onNavigate }) {
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [expandedProcedure, setExpandedProcedure] = useState(null);

  useEffect(() => {
    loadDiseases();
  }, [selectedSpecialty]);

  const loadDiseases = async () => {
    setLoading(true);
    try {
      const spec = selectedSpecialty === 'All Specialties' ? null : selectedSpecialty;
      const data = await ApiClient.fetchDiseases({ specialty: spec });
      setDiseases(data || []);
      if (data && data.length > 0 && !selectedDisease) {
        setSelectedDisease(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredDiseases = diseases.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = d.name?.toLowerCase().includes(q);
    const specMatch = d.specialty?.toLowerCase().includes(q);
    const procMatch = d.procedures?.some((p) => p.name.toLowerCase().includes(q));
    return nameMatch || specMatch || procMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-teal-800/40">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-3 border border-teal-500/30">
            <Stethoscope className="w-3.5 h-3.5" />
            Verified Clinical & Scheme Coverage Directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Disease & Treatment Explorer
          </h1>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Explore major disease conditions, standard clinical procedures, indicative hospital package benchmarks,
            official PM-JAY / Aarogyasri package codes, private health insurance waiting periods, and non-payable consumable estimates.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search disease, procedure, or symptom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        {/* Specialty Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 md:pb-0 scrollbar-none">
          {SPECIALTY_PILLS.map((sp) => (
            <button
              key={sp}
              onClick={() => setSelectedSpecialty(sp)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSpecialty === sp
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sp}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Disease List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1">
            <span>Diseases & Conditions ({filteredDiseases.length})</span>
            <span>ICD-10 Code</span>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-400">
              Loading verified disease directory...
            </div>
          ) : filteredDiseases.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-400">
              No matching diseases found.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredDiseases.map((d) => {
                const isSelected = selectedDisease?.disease_id === d.disease_id;
                return (
                  <div
                    key={d.disease_id}
                    onClick={() => {
                      setSelectedDisease(d);
                      setExpandedProcedure(d.procedures?.[0]?.procedure_id || null);
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-500 shadow-sm ring-1 ring-teal-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded">
                          {d.specialty}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">
                          {d.name}
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {d.icd_code}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                      {d.description}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{d.procedures?.length || 0} Procedures</span>
                      <span className="text-teal-700 font-semibold flex items-center gap-1">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Disease Procedures & Coverage Details (8 cols) */}
        <div className="lg:col-span-8">
          {selectedDisease ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Header */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-teal-100 text-teal-800">
                      {selectedDisease.specialty}
                    </span>
                    <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 font-semibold">
                      ICD-10: {selectedDisease.icd_code}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate && onNavigate('hospitals')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Find {selectedDisease.specialty} Hospitals
                  </button>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  {selectedDisease.name}
                </h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {selectedDisease.description}
                </p>
              </div>

              {/* Procedures Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Clinical Procedures & Financial Tariffs ({selectedDisease.procedures?.length || 0})
                </h3>

                <div className="space-y-3">
                  {selectedDisease.procedures?.map((proc) => {
                    const isExpanded = expandedProcedure === proc.procedure_id;
                    return (
                      <div
                        key={proc.procedure_id}
                        className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-all"
                      >
                        {/* Procedure Summary Bar */}
                        <div
                          onClick={() => setExpandedProcedure(isExpanded ? null : proc.procedure_id)}
                          className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-teal-100/80 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                              <HeartPulse className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                                  {proc.name}
                                </h4>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                                  {proc.clinical_category}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Typical Hospital Stay: <span className="font-semibold text-slate-700">{proc.typical_stay_days} Days</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400 font-medium block">Indicative Cost Range</span>
                              <span className="text-sm font-extrabold text-teal-700">
                                {formatCurrency(proc.indicative_cost_min)} – {formatCurrency(proc.indicative_cost_max)}
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="p-5 border-t border-slate-200 bg-slate-50/80 space-y-4 text-xs animate-fade-in">
                            {/* Scheme Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* PM-JAY Scheme Box */}
                              <div className="p-3.5 rounded-lg bg-white border border-slate-200">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                    Ayushman Bharat PM-JAY
                                  </span>
                                  {proc.pmjay_package_code && (
                                    <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                                      Code: {proc.pmjay_package_code}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-600 font-medium">{proc.pmjay_status}</p>
                                {proc.pmjay_package_rate && (
                                  <p className="text-emerald-700 font-bold mt-1">
                                    Fixed Package Rate: {formatCurrency(proc.pmjay_package_rate)}
                                  </p>
                                )}
                              </div>

                              {/* Aarogyasri Scheme Box */}
                              <div className="p-3.5 rounded-lg bg-white border border-slate-200">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                    Telangana Aarogyasri
                                  </span>
                                  {proc.aarogyasri_package_code && (
                                    <span className="font-mono text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200 font-semibold">
                                      Code: {proc.aarogyasri_package_code}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-600 font-medium">{proc.aarogyasri_status}</p>
                                {proc.aarogyasri_package_rate && (
                                  <p className="text-teal-700 font-bold mt-1">
                                    Fixed Package Rate: {formatCurrency(proc.aarogyasri_package_rate)}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Private Insurance Conditions */}
                            <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                              <h5 className="font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-600" />
                                Private Health Insurance Policy Terms
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                                <div>
                                  <span className="font-semibold text-slate-800">Coverage Status: </span>
                                  {proc.insurance_coverage_status}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-800">Waiting Period: </span>
                                  {proc.insurance_waiting_period_months} Months ({proc.insurance_waiting_period_type})
                                </div>
                              </div>
                              <p className="text-slate-500 pt-1 border-t border-slate-100">
                                <span className="font-semibold text-slate-700">Sublimit Guidelines: </span>
                                {proc.sublimits_notes}
                              </p>
                            </div>

                            {/* Non-payable consumables estimation */}
                            <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900">
                              <div className="flex items-center justify-between">
                                <span className="font-bold flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4 text-amber-600" />
                                  Estimated Out-of-Pocket Non-Payable Consumables
                                </span>
                                <span className="font-black text-sm text-amber-800">
                                  ~ {formatCurrency(proc.non_payable_expenses_inr)}
                                </span>
                              </div>
                              <p className="text-xs text-amber-800/90 mt-1">
                                IRDAI Non-Payable Items (List I) not reimbursed by standard base health policies unless consumable rider is added:
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {proc.non_payable_items?.map((item, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-white/80 border border-amber-200 text-[11px] font-medium text-amber-900">
                                    • {item}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 flex flex-wrap gap-3">
                              <button
                                onClick={() => onNavigate && onNavigate('estimator')}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                              >
                                Calculate Out-of-Pocket Expense
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onNavigate && onNavigate('insurance')}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition-all"
                              >
                                Check Policy Wordings & Waiting Periods
                              </button>
                            </div>

                            <p className="text-[10px] text-slate-400 italic">
                              Source: {proc.official_source}. Rates and package codes reflect official government schedules and registered policy filings.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Select a disease from the list to view verified clinical procedures, scheme package codes, and private policy terms.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
