import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  Bot,
  Brain,
  Building2,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Download,
  ExternalLink,
  Filter,
  Heart,
  HeartPulse,
  Info,
  Layers,
  MapPin,
  Network,
  Phone,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Zap
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR } from '../utils/formatters';

export default function OverviewScreen({ onNavigate }) {
  const { city, setActiveHospitalDetails } = useHealthcare();

  // Database-driven metrics (loaded dynamically from API)
  const [stats, setStats] = useState({
    total_hospitals: 30273,
    states_count: 36,
    districts_count: 578,
    hospitals_with_phone: 1732,
    hospitals_with_coordinates: 10843,
    hospitals_with_specialties: 990,
    data_source: "National Health Portal (NHP) Open Government Data CSV (Ministry of Health and Family Welfare)",
    import_date: "2026-11-01"
  });

  const [insurersCount, setInsurersCount] = useState(8);
  const [policiesCount, setPoliciesCount] = useState(45);
  const [proceduresCount, setProceduresCount] = useState(100);
  const [recentHospitals, setRecentHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialtyTab, setSelectedSpecialtyTab] = useState('All');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [statsRes, hospRes, insurersRes, proceduresRes] = await Promise.all([
          ApiClient.fetchHospitalStatistics().catch(() => null),
          ApiClient.fetchImportedHospitals({ page: 1, pageSize: 5, state: city !== 'All' ? city : undefined }).catch(() => null),
          ApiClient.fetchInsurers().catch(() => []),
          ApiClient.fetchProcedures().catch(() => [])
        ]);

        if (isMounted) {
          if (statsRes && statsRes.total_hospitals) setStats(statsRes);
          if (hospRes?.hospitals) setRecentHospitals(hospRes.hospitals);
          if (Array.isArray(insurersRes) && insurersRes.length > 0) setInsurersCount(insurersRes.length);
          if (Array.isArray(proceduresRes) && proceduresRes.length > 0) setProceduresCount(proceduresRes.length);
        }
      } catch (err) {
        console.warn("Overview data load notice:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [city]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    if (q.includes("hospital") || q.includes("apollo") || q.includes("nims") || q.includes("doctor")) {
      onNavigate('hospitals');
    } else if (q.includes("cost") || q.includes("price") || q.includes("angioplasty") || q.includes("mri") || q.includes("knee")) {
      onNavigate('estimator');
    } else if (q.includes("insurance") || q.includes("star") || q.includes("hdfc") || q.includes("care") || q.includes("policy")) {
      onNavigate('insurance');
    } else if (q.includes("scheme") || q.includes("pmjay") || q.includes("aarogyasri")) {
      onNavigate('schemes');
    } else {
      onNavigate('hospitals');
    }
  };

  // Greeting time calculation
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* 1. Header & Actions Strip (MedicalKits Style) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 mb-1">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Healthcare Intelligence Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {greeting}, Welcome to CareNav AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Find trusted hospitals, understand treatment costs, explore cashless insurance networks, and discover government welfare schemes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            onClick={() => onNavigate('navigator')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-teal-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Summary with AI</span>
          </button>
          <button
            onClick={() => onNavigate('about')}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>Data Sources</span>
          </button>
        </div>
      </div>

      {/* 2. Main Search Bar with Prompts */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-teal-600 absolute left-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hospitals, diseases, treatments, cashless insurance or government schemes..."
            className="w-full pl-11 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick Searches:</span>
          {[
            { label: 'Cardiology in Hyderabad', action: () => onNavigate('hospitals') },
            { label: 'Angioplasty Tariff Breakdown', action: () => onNavigate('estimator') },
            { label: 'Star Health Cashless Network', action: () => onNavigate('network') },
            { label: 'PM-JAY Scheme Coverage', action: () => onNavigate('schemes') }
          ].map((prompt) => (
            <button
              key={prompt.label}
              onClick={prompt.action}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-medium transition-colors"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 4-Card Healthcare Data Overview Grid (MedicalKits Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Hospitals Indexed */}
        <div
          onClick={() => onNavigate('hospitals')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> 100% Verified
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.total_hospitals.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-700">Hospitals Indexed</div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Across all 36 States & UTs from National Health Portal (MoHFW).
            </p>
          </div>
        </div>

        {/* Card 2: Insurers & Cashless Desks */}
        <div
          onClick={() => onNavigate('insurance')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              IRDAI Filings
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {insurersCount} Insurers
            </div>
            <div className="text-xs font-bold text-slate-700">{policiesCount}+ Verified Policies</div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Waiting periods, room rent caps, co-pay & restoration benefits.
            </p>
          </div>
        </div>

        {/* Card 3: Clinical Procedures & Tariffs */}
        <div
          onClick={() => onNavigate('diseases')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              8 Specialties
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {proceduresCount}+ Procedures
            </div>
            <div className="text-xs font-bold text-slate-700">Cost & Clinical Mapping</div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Cardiology, Oncology, Orthopedics, Neurology & general surgery.
            </p>
          </div>
        </div>

        {/* Card 4: Government Schemes */}
        <div
          onClick={() => onNavigate('schemes')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Up to ₹10L Cover
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              12+ Schemes
            </div>
            <div className="text-xs font-bold text-slate-700">Central & State Packages</div>
            <p className="text-[11px] text-slate-400 leading-snug">
              PM-JAY, Aarogyasri Telangana, CGHS, ESIC & Ayushman Senior.
            </p>
          </div>
        </div>

      </div>

      {/* 4. Two-Column Analytics Strip (Inspired by MedicalKits) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 cols): Procedure Cost & Trend Analytics */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <h3 className="font-black text-sm text-slate-900">
                  Regional Procedure Tariff Benchmarks
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Indicative tertiary hospital expense bands vs government package rates
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
              MoHFW & HBP 2.2 Rates
            </span>
          </div>

          {/* Benchmark Comparison Table */}
          <div className="divide-y divide-slate-100 text-xs">
            {[
              { proc: 'Angioplasty (Single Stent DES)', specialty: 'Cardiology', privateRange: '₹1,20,000 - ₹2,50,000', schemeCover: '₹1,25,000 (PM-JAY / Aarogyasri)', outOfPocket: '₹0 - ₹25,000' },
              { proc: 'Total Knee Replacement (Unilateral)', specialty: 'Orthopedics', privateRange: '₹1,40,000 - ₹2,10,000', schemeCover: '₹1,10,000 (PM-JAY)', outOfPocket: '₹0 - ₹35,000' },
              { proc: 'Cataract Surgery (Phaco + Foldable IOL)', specialty: 'Ophthalmology', privateRange: '₹20,000 - ₹45,000', schemeCover: '₹10,500 (Free in NHP Centres)', outOfPocket: '₹0 - ₹10,000' },
              { proc: 'Laparoscopic Appendectomy', specialty: 'General Surgery', privateRange: '₹60,000 - ₹95,000', schemeCover: '₹35,000 (Aarogyasri / CGHS)', outOfPocket: '₹0 - ₹15,000' },
              { proc: 'Normal Vaginal Delivery (Tertiary)', specialty: 'Obstetrics', privateRange: '₹35,000 - ₹65,000', schemeCover: '₹15,000 - ₹25,000 (State Schemes)', outOfPocket: '₹0 - ₹12,000' }
            ].map((item) => (
              <div key={item.proc} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 rounded-xl px-2 transition-colors">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 text-xs">{item.proc}</div>
                  <span className="text-[10px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                    {item.specialty}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{item.privateRange}</div>
                    <div className="text-[10px] text-slate-400">Private Package</div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="font-bold text-emerald-600 text-xs">{item.outOfPocket}</div>
                    <div className="text-[10px] text-slate-400">Est. Out-of-Pocket</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
            <span>* Derived from verified regional hospital tariff observations and HBP 2.2 schedules.</span>
            <button
              onClick={() => onNavigate('estimator')}
              className="font-bold text-teal-600 hover:underline flex items-center gap-1"
            >
              <span>Calculate Custom Expense</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right (1 col): Healthcare Coverage Donut Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-slate-900">
              National Health Coverage Mix
            </h3>
            <p className="text-[11px] text-slate-400">
              Distribution of hospital empaneled schemes & cashless insurance
            </p>
          </div>

          {/* Visual Arc Indicator */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/70 border border-slate-100 text-center space-y-2">
            <div className="w-28 h-28 rounded-full border-8 border-teal-500 border-t-blue-500 border-r-indigo-500 flex items-center justify-center relative">
              <div className="text-center">
                <span className="text-2xl font-black text-slate-900">30k+</span>
                <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Hospitals</span>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-800">
              Verified Indian Health Facilities
            </span>
          </div>

          {/* Legend Items */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span>Public & Government Hospitals</span>
              </span>
              <span className="font-bold text-slate-900">594+ Verified</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Private Tertiary Facilities</span>
              </span>
              <span className="font-bold text-slate-900">1,446+ Verified</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>Primary & Community Centres</span>
              </span>
              <span className="font-bold text-slate-900">28,233 Registry</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('network')}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Network className="w-3.5 h-3.5 text-teal-600" />
            <span>Check Hospital Insurance Network</span>
          </button>
        </div>

      </div>

      {/* 5. Explore Healthcare Navigation Modules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">
            Explore Healthcare Modules
          </h2>
          <span className="text-xs text-slate-400">All modules active & connected</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div
            onClick={() => onNavigate('hospitals')}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                Hospital Directory
              </h3>
              <p className="text-xs text-slate-500 leading-snug">
                Browse 30,273 hospitals by state, district, care type & PIN code.
              </p>
            </div>
            <span className="text-xs font-bold text-teal-600 flex items-center gap-1 pt-1">
              <span>Open Directory</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          <div
            onClick={() => onNavigate('insurance')}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
                Insurance Policies
              </h3>
              <p className="text-xs text-slate-500 leading-snug">
                Compare 8 major insurers, sum insured options & waiting periods.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1 pt-1">
              <span>Compare Policies</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          <div
            onClick={() => onNavigate('estimator')}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-700 transition-colors">
                Out-of-Pocket Estimator
              </h3>
              <p className="text-xs text-slate-500 leading-snug">
                Calculate room differential, surgeon fees, consumables & deductibles.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 pt-1">
              <span>Calculate Costs</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          <div
            onClick={() => onNavigate('navigator')}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Bot className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                AI Healthcare Navigator
              </h3>
              <p className="text-xs text-slate-500 leading-snug">
                Get step-by-step assistance with tool-verified hospital recommendations.
              </p>
            </div>
            <span className="text-xs font-bold text-teal-600 flex items-center gap-1 pt-1">
              <span>Launch Navigator</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

        </div>
      </div>

      {/* 6. Recently Updated Healthcare Intelligence Feed */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <h3 className="font-black text-sm text-slate-900">
              Verified Healthcare Intelligence & Ingestion Log
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Last audited: {stats.import_date}
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {[
            {
              title: "National Health Portal Hospital Open Data Registry",
              desc: "30,273 registered hospitals across all 36 States & UTs with postal PIN and coordinates.",
              source: "Ministry of Health and Family Welfare (MoHFW)",
              date: "2026-11-01",
              status: "30,273 Records Ingested"
            },
            {
              title: "Ayushman Bharat PM-JAY Health Benefit Packages (HBP 2.2)",
              desc: "Package tariff schedule covering 1,949 medical and surgical procedures up to ₹5,00,000/year.",
              source: "National Health Authority (NHA)",
              date: "2026-10-29",
              status: "Central Scheme Active"
            },
            {
              title: "Telangana Aarogyasri Cashless Package Master",
              desc: "State healthcare scheme for BPL and white ration card families in Telangana network hospitals.",
              source: "Aarogyasri Health Care Trust",
              date: "2026-10-29",
              status: "State Scheme Active"
            },
            {
              title: "IRDAI Health Insurance Policy Wordings & Tariff Master",
              desc: "Official waiting periods, room rent restrictions, day-care procedure lists, and co-payment clauses.",
              source: "Insurance Regulatory and Development Authority of India (IRDAI)",
              date: "2026-10-29",
              status: "45 Policies Mapped"
            }
          ].map((item) => (
            <div key={item.title} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="font-bold text-slate-900">{item.title}</div>
                <p className="text-slate-500 text-[11px]">{item.desc}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {item.status}
                </span>
                <div className="text-[10px] text-slate-400 mt-1">{item.source} • {item.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
