import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileCheck,
  Filter,
  HeartHandshake,
  Landmark,
  Loader2,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR, getDataModeBadge } from '../utils/formatters';

export default function SchemesScreen({ onNavigate }) {
  const { city, setEligibilityModalScheme } = useHealthcare();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchemeDetail, setSelectedSchemeDetail] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await ApiClient.fetchSchemes();
        setSchemes(data.schemes || []);
      } catch (err) {
        console.error("Error loading schemes:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredSchemes = schemes.filter((s) => {
    if (activeTab === 'Central' && s.category !== 'Government') return false;
    if (activeTab === 'Telangana' && s.category !== 'State') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.short_code.toLowerCase().includes(q) ||
        (s.eligibility_summary && s.eligibility_summary.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. Header with Title & Subtitle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shrink-0">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Government Healthcare Schemes
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Explore major government health insurance schemes, eligibility, benefits and application process.
            </p>
          </div>
        </div>

        <button
          onClick={() => setEligibilityModalScheme(schemes[0] || { id: 'scheme-pmjay', name: 'Ayushman Bharat (PM-JAY)', short_code: 'PM-JAY' })}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>Quick Eligibility Check</span>
        </button>
      </div>

      {/* 2. Category Tabs & Search Bar (Matching Reference Image) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-2">
          {['All Schemes', 'Central Schemes', 'Telangana Schemes'].map((tab) => {
            const tabKey = tab.split(' ')[0];
            const isActive = activeTab === tabKey || (tabKey === 'All' && activeTab === 'All');

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tabKey)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemes or benefits..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>
      </div>

      {/* 3. Schemes Cards Grid (Matching Reference Image) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <div key={n} className="p-6 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-4">
              <div className="h-5 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSchemes.map((scheme) => {
            const isPMJAY = scheme.short_code === 'PM-JAY';
            const isAarogyasri = scheme.short_code === 'AAROGYASRI';

            return (
              <div
                key={scheme.id}
                className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  {/* Card Header with Insignia */}
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
                      isPMJAY
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : isAarogyasri
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      <ShieldCheck className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {scheme.category === 'Government' ? 'Central Government' : scheme.category === 'State' ? 'Telangana State' : 'Social Security'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          100% Cashless
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                        {scheme.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        {scheme.short_code} Official Healthcare Benefit
                      </p>
                    </div>
                  </div>

                  {/* Core Attribute Rows (Matching Reference Image) */}
                  <div className="space-y-3 text-xs pt-3 border-t border-slate-100">
                    {/* Coverage */}
                    <div className="grid grid-cols-3 gap-2">
                      <span className="font-bold text-slate-400">Coverage:</span>
                      <span className="col-span-2 font-black text-emerald-700 text-sm">
                        {scheme.coverage_limit ? `Up to ${formatINR(scheme.coverage_limit)} per family/year` : 'Comprehensive Cashless'}
                      </span>
                    </div>

                    {/* Beneficiaries */}
                    <div className="grid grid-cols-3 gap-2">
                      <span className="font-bold text-slate-400">Beneficiaries:</span>
                      <span className="col-span-2 text-slate-700 font-medium leading-relaxed">
                        {isPMJAY
                          ? 'Economically vulnerable families (SECC 2011) and all senior citizens aged 70+.'
                          : isAarogyasri
                          ? 'Telangana resident families holding Food Security / White Ration Card.'
                          : scheme.eligibility_summary}
                      </span>
                    </div>

                    {/* Key Benefits */}
                    <div className="grid grid-cols-3 gap-2">
                      <span className="font-bold text-slate-400">Key Benefits:</span>
                      <span className="col-span-2 text-slate-700 font-medium leading-relaxed">
                        {isPMJAY
                          ? 'Cashless secondary and tertiary hospitalization across empaneled public & private hospitals.'
                          : isAarogyasri
                          ? 'Cashless surgical care, ICU stays, implants, and 10 days post-discharge medications.'
                          : scheme.claim_process_summary}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons (Matching Reference Image) */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setEligibilityModalScheme(scheme)}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Check Eligibility</span>
                  </button>

                  <button
                    onClick={() => setSelectedSchemeDetail(scheme)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scheme Detail Modal */}
      {selectedSchemeDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedSchemeDetail(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                  {selectedSchemeDetail.short_code}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedSchemeDetail.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSchemeDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Coverage Limit</h4>
                <p className="text-emerald-700 font-black text-base">
                  {selectedSchemeDetail.coverage_limit ? formatINR(selectedSchemeDetail.coverage_limit) : 'Full Cashless'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">Claim Process & Helpdesk</h4>
                <p className="text-slate-700 leading-relaxed">{selectedSchemeDetail.claim_process_summary}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">Covered Specialties</h4>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {selectedSchemeDetail.covered_specialties?.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {selectedSchemeDetail.official_portal && (
                <div className="pt-2">
                  <a
                    href={selectedSchemeDetail.official_portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-teal-700 font-bold hover:underline"
                  >
                    <span>Visit Official Scheme Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedSchemeDetail(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const s = selectedSchemeDetail;
                  setSelectedSchemeDetail(null);
                  setEligibilityModalScheme(s);
                }}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs"
              >
                Check My Eligibility Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
