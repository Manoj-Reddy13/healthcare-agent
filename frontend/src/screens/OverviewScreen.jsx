import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  Bot,
  Brain,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  Heart,
  HeartHandshake,
  HeartPulse,
  Landmark,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Zap
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR, formatINRCompact, getDataModeBadge } from '../utils/formatters';

export default function OverviewScreen({ onNavigate }) {
  const { city, updatePlan, setActiveHospitalDetails, setSelectedHospitalForBooking } = useHealthcare();
  const [hospitals, setHospitals] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [hospRes, treatRes, schemeRes] = await Promise.all([
          ApiClient.fetchHospitals({ city }),
          ApiClient.fetchTreatments(),
          ApiClient.fetchSchemes()
        ]);
        setHospitals(hospRes.hospitals || []);
        setTreatments(treatRes || []);
        setSchemes(schemeRes.schemes || []);
      } catch (err) {
        console.error("Error loading overview data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [city]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    if (query.includes("cost") || query.includes("price") || query.includes("angioplasty") || query.includes("knee") || query.includes("mri") || query.includes("delivery")) {
      onNavigate('estimator');
    } else if (query.includes("scheme") || query.includes("pmjay") || query.includes("aarogyasri") || query.includes("insurance")) {
      onNavigate('schemes');
    } else if (query.includes("hospital") || query.includes("apollo") || query.includes("nims") || query.includes("kims") || query.includes("doctor")) {
      onNavigate('hospitals');
    } else {
      onNavigate('navigator');
    }
  };

  const SPECIALTIES = [
    { name: 'Cardiology', icon: Heart, count: '6 Hospitals', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
    { name: 'Orthopedics', icon: Activity, count: '5 Hospitals', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
    { name: 'Oncology', icon: Sparkles, count: '4 Hospitals', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
    { name: 'Neurology', icon: Brain, count: '4 Hospitals', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
    { name: 'Nephrology', icon: Stethoscope, count: '3 Hospitals', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
    { name: 'Pediatrics', icon: HeartHandshake, count: '4 Hospitals', color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      
      {/* 1. Hero Banner with Modern Hospital Illustration (Clean Light SaaS Style) */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8 md:p-10">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Left Text & Search */}
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Your AI-Powered <br className="hidden sm:inline" />
              <span className="text-emerald-600">
                Healthcare Navigation Platform
              </span>
            </h1>

            <p className="text-slate-600 text-xs sm:text-sm md:text-base leading-relaxed">
              Find hospitals, estimate treatment costs, explore government schemes, and get a personalized healthcare plan — all in one place.
            </p>

            {/* Main Interactive Search Input */}
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="flex items-center bg-slate-50 rounded-2xl p-1.5 shadow-sm border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition-all max-w-xl">
                <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for treatment, hospital, scheme... (e.g., Angioplasty in Hyderabad)"
                  className="w-full px-3 py-2 text-xs sm:text-sm text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/30 shrink-0 flex items-center justify-center"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Prompt Pills */}
              <div className="flex items-center gap-2 flex-wrap pt-2.5 text-xs text-slate-500">
                <span className="text-[11px] font-semibold text-slate-400">Popular:</span>
                {['Angioplasty', 'Knee Replacement', 'PM-JAY', 'NIMS Hospital', 'Apollo'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setSearchQuery(term);
                      if (term.includes('Angioplasty') || term.includes('Knee')) onNavigate('estimator');
                      else if (term.includes('PM-JAY')) onNavigate('schemes');
                      else onNavigate('hospitals');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Right Visual: Hospital Building Graphic */}
          <div className="w-full lg:w-80 shrink-0 flex items-center justify-center">
            <div className="relative rounded-2xl bg-gradient-to-tr from-teal-50 via-emerald-50 to-blue-50 border border-slate-200 p-6 shadow-sm text-center space-y-3 w-full">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
                <Building2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">CareNav Healthcare</h3>
                <p className="text-xs text-slate-500 mt-0.5">Empaneled & Verified Hospital Directory</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-slate-200/80 text-xs">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Network</span>
                  <span className="font-bold text-emerald-700">Cashless Direct</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Standards</span>
                  <span className="font-bold text-teal-700">NABH & JCI</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Four Quick Action Cards (Matching Screenshot) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Find Hospitals */}
        <div
          onClick={() => onNavigate('hospitals')}
          className="group cursor-pointer p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900 group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-emerald-600 transition-colors">
              <span>Find Hospitals</span>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              Search nearby & accredited hospitals
            </p>
          </div>
        </div>

        {/* Card 2: Estimate Costs */}
        <div
          onClick={() => onNavigate('estimator')}
          className="group cursor-pointer p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900 group-hover:scale-105 transition-transform">
            <Calculator className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-blue-600 transition-colors">
              <span>Estimate Costs</span>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              Check treatment cost range & stay
            </p>
          </div>
        </div>

        {/* Card 3: Govt Schemes */}
        <div
          onClick={() => onNavigate('schemes')}
          className="group cursor-pointer p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-amber-600 transition-colors">
              <span>Govt Schemes</span>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              Explore PM-JAY, Aarogyasri & more
            </p>
          </div>
        </div>

        {/* Card 4: AI Navigator */}
        <div
          onClick={() => onNavigate('navigator')}
          className="group cursor-pointer p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-200 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-100 dark:border-teal-900 group-hover:scale-105 transition-transform">
            <Bot className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-teal-600 transition-colors">
              <span>AI Navigator</span>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              Ask anything about care & costs
            </p>
          </div>
        </div>

      </section>

      {/* 3. Healthcare Insights Strip (Real Data-Driven Stats) */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Healthcare Insights & Regional Coverage
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            Service City: {city}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-medium text-slate-500">Accredited Hospitals</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {loading ? '...' : `${hospitals.length || 6}+`}
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> NABH / NABL Network
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-medium text-slate-500">Treatment Benchmarks</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {loading ? '...' : `${treatments.length || 10}+`}
            </div>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Multi-tier packages
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-medium text-slate-500">Flagship Govt Schemes</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {loading ? '...' : `${schemes.length || 4}`}
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Central & State
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-medium text-slate-500">Max Scheme Coverage</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ₹5L - ₹10L
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              PM-JAY & Aarogyasri Trust
            </p>
          </div>

        </div>
      </section>

      {/* 4. Popular Specialties Row (Matching Reference Image) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Popular Clinical Specialties
            </h2>
          </div>
          <button
            onClick={() => onNavigate('hospitals')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SPECIALTIES.map((spec) => {
            const Icon = spec.icon;
            return (
              <button
                key={spec.name}
                onClick={() => onNavigate('hospitals')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-sm hover:shadow text-center space-y-2 transition-all group"
              >
                <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center border ${spec.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-emerald-600">
                    {spec.name}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {spec.count}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Featured Hospitals Preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Empaneled Regional Hospitals in {city}
            </h2>
            <p className="text-xs text-slate-500">Verified facilities with accredited emergency and surgical infrastructure</p>
          </div>
          <button
            onClick={() => onNavigate('hospitals')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            Explore Directory
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.slice(0, 3).map((hosp) => (
            <div
              key={hosp.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                      {hosp.accreditation?.[0] || 'NABH'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      ~{hosp.distance_km} km
                    </span>
                  </div>
                  <div className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-200">
                    ★ {hosp.rating?.toFixed(1) || '4.5'}
                  </div>
                </div>

                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                  {hosp.name}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {hosp.address}
                </p>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {hosp.specialties?.slice(0, 3).map((s) => (
                    <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setActiveHospitalDetails(hosp);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => {
                    setSelectedHospitalForBooking(hosp);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Book Demo
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

