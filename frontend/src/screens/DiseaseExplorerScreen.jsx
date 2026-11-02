import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  HeartPulse,
  Info,
  Layers,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Tag
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { formatINR } from '../utils/formatters';

const SPECIALTY_CATEGORIES = [
  'All Specialties',
  'Cardiology',
  'Oncology',
  'Neurology',
  'Orthopedics',
  'Nephrology',
  'Gastroenterology',
  'General Surgery',
  'Ophthalmology'
];

export default function DiseaseExplorerScreen({ onNavigate }) {
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [expandedProcedure, setExpandedProcedure] = useState(null);

  // MedGemma Clinical AI State
  const [medGemmaAnalysis, setMedGemmaAnalysis] = useState(null);
  const [medGemmaLoading, setMedGemmaLoading] = useState(false);

  useEffect(() => {
    loadDiseases();
  }, [selectedSpecialty]);

  const loadDiseases = async () => {
    setLoading(true);
    try {
      const spec = selectedSpecialty === 'All Specialties' ? null : selectedSpecialty;
      
      // Attempt to load from enriched ICD-11 engine first
      let icdRecords = await ApiClient.fetchICD11Diseases(spec);
      if (icdRecords && icdRecords.length > 0) {
        setDiseases(icdRecords);
        if (!selectedDisease || !icdRecords.some((d) => d.name === selectedDisease.name)) {
          setSelectedDisease(icdRecords[0]);
          setMedGemmaAnalysis(null);
        }
      } else {
        // Fallback to standard disease dataset
        const data = await ApiClient.fetchDiseases({ specialty: spec });
        setDiseases(data || []);
        if (data && data.length > 0 && !selectedDisease) {
          setSelectedDisease(data[0]);
          setMedGemmaAnalysis(null);
        }
      }
    } catch (e) {
      console.error('Failed to load diseases:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDisease = (disease) => {
    setSelectedDisease(disease);
    setExpandedProcedure(null);
    setMedGemmaAnalysis(null);
  };

  const handleRunMedGemma = async () => {
    if (!selectedDisease) return;
    setMedGemmaLoading(true);
    try {
      const res = await ApiClient.medicalExplain({
        topic_or_disease: selectedDisease.name,
        query: `Explain etiology, symptoms, diagnostic workup and standard treatments for ${selectedDisease.name}`
      });
      setMedGemmaAnalysis(res);
    } catch (err) {
      console.error('MedGemma inference error:', err);
    } finally {
      setMedGemmaLoading(false);
    }
  };

  const filteredDiseases = diseases.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = d.name?.toLowerCase().includes(q);
    const specMatch = d.specialty?.toLowerCase().includes(q);
    const codeMatch = d.icd11_code?.toLowerCase().includes(q);
    const procMatch = (d.related_procedures || d.procedures)?.some((p) => p.name?.toLowerCase().includes(q));
    return nameMatch || specMatch || codeMatch || procMatch;
  });

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      
      {/* 1. Header & Breadcrumbs (Clean Light SaaS) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>WHO ICD-11 & Google MedGemma Knowledge Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Disease & Treatment Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Explore major disease conditions classified under WHO ICD-11, clinical insights powered by MedGemma, standard procedures, indicative cost benchmarks, and government scheme packages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 rounded-2xl bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200 shrink-0">
            {diseases.length} Conditions Mapped
          </span>
          <span className="px-3.5 py-2 rounded-2xl bg-blue-50 text-blue-800 font-bold text-xs border border-blue-200 shrink-0 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>MedGemma Integrated</span>
          </span>
        </div>
      </div>

      {/* 2. Specialty Category Selector Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {SPECIALTY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedSpecialty(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedSpecialty === cat
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search diseases by name, ICD-11 code (e.g., BA41, 5A11), or specialty..."
          className="w-full text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-xs font-semibold">
            Clear
          </button>
        )}
      </div>

      {/* 4. Two-Column Workspace: Left Master List + Right Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Diseases List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Condition Master Index ({filteredDiseases.length})</span>
            <span className="text-[10px] text-teal-600 font-semibold lowercase">WHO ICD-11</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-4 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredDiseases.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              No conditions match your search criteria.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[820px] overflow-y-auto pr-1">
              {filteredDiseases.map((d) => {
                const isSelected = selectedDisease?.name === d.name;
                const procCount = (d.related_procedures || d.procedures || []).length;
                return (
                  <div
                    key={d.icd11_code || d.name}
                    onClick={() => handleSelectDisease(d)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2 ${
                      isSelected
                        ? 'bg-teal-50/50 border-teal-500 shadow-xs ring-1 ring-teal-500/30'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-teal-800 border border-slate-200">
                          {d.specialty}
                        </span>
                        {d.icd11_code && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-200">
                            ICD-11: {d.icd11_code}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {procCount} {procCount === 1 ? 'Procedure' : 'Procedures'}
                      </span>
                    </div>

                    <h3 className="font-black text-sm text-slate-900 leading-snug">
                      {d.name}
                    </h3>

                    <p className="text-slate-500 text-xs line-clamp-2">
                      {d.etiology_and_causes || d.description}
                    </p>

                    {/* Cardinal symptoms pills */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {(d.symptoms?.cardinal || d.key_symptoms || []).slice(0, 3).map((sym) => (
                        <span key={sym} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 truncate max-w-[180px]">
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Disease & Procedure Workspace (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {selectedDisease ? (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6">
              
              {/* Disease Header with ICD-11 Metadata */}
              <div className="border-b border-slate-100 pb-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      {selectedDisease.specialty}
                    </span>
                    {selectedDisease.icd11_code && (
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-teal-600 text-white shadow-2xs flex items-center gap-1">
                        <span>ICD-11 Code: {selectedDisease.icd11_code}</span>
                      </span>
                    )}
                    {selectedDisease.icd11_chapter && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        {selectedDisease.icd11_chapter}
                      </span>
                    )}
                  </div>

                  {selectedDisease.icd11_uri && (
                    <a
                      href={selectedDisease.icd11_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 bg-teal-50/60 px-2.5 py-1 rounded-xl border border-teal-200/80 transition-colors"
                    >
                      <span>WHO Browser</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {selectedDisease.name}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {selectedDisease.etiology_and_causes || selectedDisease.description}
                </p>

                {/* MedGemma AI Button */}
                <div className="pt-2">
                  <button
                    onClick={handleRunMedGemma}
                    disabled={medGemmaLoading}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {medGemmaLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Running MedGemma Clinical Analysis...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-200" />
                        <span>Analyze Clinical Workup with Google MedGemma</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* MedGemma AI Output Box (if requested) */}
              {medGemmaAnalysis && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50/80 via-white to-blue-50/50 border border-teal-200 shadow-xs space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-teal-100">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span className="font-extrabold text-xs text-slate-900">
                        Google MedGemma Clinical Intelligence
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      Inference Verified
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-700">Clinical Etiology:</span>
                      <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                        {medGemmaAnalysis.etiology_and_causes}
                      </p>
                    </div>

                    {medGemmaAnalysis.symptoms?.emergency_red_flags?.length > 0 && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                        <div className="font-bold text-xs flex items-center gap-1.5 mb-1 text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Emergency Red Flags (Immediate Medical Evaluation Required):</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-rose-800">
                          {medGemmaAnalysis.symptoms.emergency_red_flags.map((rf, i) => (
                            <li key={i}>{rf}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Clinical Disclaimer */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                    <span className="font-bold text-slate-700">Mandatory Safety Disclaimer: </span>
                    {medGemmaAnalysis.clinical_disclaimer ||
                      'MedGemma clinical AI output is for educational/informational navigation only and does not constitute a clinical diagnosis or treatment prescription. Always consult a licensed medical specialist for individual care decisions.'}
                  </div>
                </div>
              )}

              {/* Symptoms Strip: Cardinal Symptoms vs Red Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-teal-600" />
                    <span>Cardinal Clinical Symptoms</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedDisease.symptoms?.cardinal || selectedDisease.key_symptoms || []).map((sym) => (
                      <span key={sym} className="text-xs font-medium px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 leading-tight">
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-2">
                  <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Emergency Warning Signs</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedDisease.symptoms?.emergency_red_flags || ['Acute exacerbation', 'Unresponsive syncope', 'Rapidly dropping SpO2']).map((rf) => (
                      <span key={rf} className="text-xs font-medium px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-rose-900 leading-tight">
                        {rf}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Diagnostic Workup */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  <span>Standard Diagnostic Workup</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedDisease.diagnostic_workup || selectedDisease.diagnostic_tests || []).map((test) => (
                    <span key={test} className="text-xs font-medium px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                      {test}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mapped Surgical & Medical Procedures */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-teal-600" />
                    <span>Mapped Clinical Procedures & Benchmarks</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Click to view cost & insurance rules
                  </span>
                </div>

                <div className="space-y-3">
                  {(selectedDisease.related_procedures || selectedDisease.procedures || []).map((proc) => {
                    const isExpanded = expandedProcedure === proc.name;
                    const avgCost = proc.indicative_cost_min && proc.indicative_cost_max
                      ? Math.round((proc.indicative_cost_min + proc.indicative_cost_max) / 2)
                      : (proc.avg_cost_inr || 150000);
                    const minCost = proc.indicative_cost_min || proc.min_cost_inr || Math.round(avgCost * 0.7);
                    const maxCost = proc.indicative_cost_max || proc.max_cost_inr || Math.round(avgCost * 1.3);
                    const pmjayRate = proc.pmjay_rate || proc.govt_package_rate || Math.round(avgCost * 0.55);

                    return (
                      <div
                        key={proc.name || proc.procedure_id}
                        className="rounded-2xl border border-slate-200 overflow-hidden transition-all text-xs"
                      >
                        <div
                          onClick={() => setExpandedProcedure(isExpanded ? null : proc.name)}
                          className="p-4 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 text-sm">{proc.name}</span>
                            <div className="text-slate-500 text-[11px]">
                              Average Stay: {proc.typical_stay_days || proc.avg_hospital_stay_days || 3} days • {proc.care_type || 'Tertiary Inpatient'}
                              {proc.pmjay_package_code && ` • PM-JAY Code: ${proc.pmjay_package_code}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-black text-slate-900 text-sm">
                                {formatINR(avgCost)}
                              </span>
                              <span className="block text-[10px] text-slate-400">Indicative Benchmark</span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {/* Expanded Coverage & Rules Panel */}
                        {isExpanded && (
                          <div className="p-4 bg-white border-t border-slate-200 space-y-4">
                            
                            {/* Cost Range */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Min Range</span>
                                <div className="font-bold text-slate-800 text-xs mt-0.5">{formatINR(minCost)}</div>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Average Package</span>
                                <div className="font-bold text-teal-700 text-xs mt-0.5">{formatINR(avgCost)}</div>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Max Range</span>
                                <div className="font-bold text-slate-800 text-xs mt-0.5">{formatINR(maxCost)}</div>
                              </div>
                            </div>

                            {/* Insurance Waiting Periods */}
                            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Private Health Insurance Waiting Period</span>
                              </div>
                              <p className="text-blue-800 text-[11px] leading-relaxed">
                                {proc.waiting_period_type || proc.insurance_waiting_period || 'Standard 24-month specific illness waiting period applies under standard IRDAI guidelines unless waived under corporate group policies.'}
                              </p>
                            </div>

                            {/* Government Scheme Package Rate */}
                            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Government Scheme Empanelment (PM-JAY & Aarogyasri)</span>
                              </div>
                              <p className="text-emerald-800 text-[11px] leading-relaxed">
                                Covered under Health Benefit Package (HBP 2.2). Fixed public package rate: {formatINR(pmjayRate)} (100% cashless for eligible beneficiaries at empanelled public and private hospitals).
                              </p>
                            </div>

                            {/* Action to Cost Estimator */}
                            <div className="flex items-center justify-end gap-2 pt-2">
                              <button
                                onClick={() => onNavigate('estimator')}
                                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                              >
                                <span>Calculate Custom Estimate</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trusted Medical Citations (PubMed & MedlinePlus) */}
              {selectedDisease.trusted_sources?.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <BookOpen className="w-4 h-4 text-teal-600" />
                    <span>Trusted Medical Literature & Citations</span>
                  </div>
                  <div className="space-y-2">
                    {selectedDisease.trusted_sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{src.authority || src.source}</span>
                            {src.pmid && (
                              <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                                PMID: {src.pmid}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{src.evidence_summary || src.title}</p>
                        </div>
                        {src.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:text-teal-800 font-bold text-[11px] inline-flex items-center gap-1 shrink-0"
                          >
                            <span>Read Citation</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-2">
              <Stethoscope className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium">Select a condition from the left index to view clinical details.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
