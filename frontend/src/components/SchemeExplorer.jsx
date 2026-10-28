import React, { useState, useEffect } from 'react';
import { ExternalLink, FileCheck, Filter, HeartHandshake, Shield, Sparkles } from 'lucide-react';
import { ApiClient } from '../api/client';
import { formatINR, getDataModeBadge } from '../utils/formatters';

export default function SchemeExplorer() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [incomeFilter, setIncomeFilter] = useState('All');

  const loadSchemes = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.fetchSchemes({
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        incomeBracket: incomeFilter === 'bpl' ? 'bpl' : undefined,
      });
      setSchemes(data.schemes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemes();
  }, [categoryFilter, incomeFilter]);

  const categories = ['All', 'Government', 'State', 'Social Security'];

  return (
    <div className="space-y-6">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-br from-teal-700 via-cyan-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-cyan-300 text-xs sm:text-sm font-semibold uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          <span>Public & Subsidized Healthcare Schemes</span>
        </div>
        <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
          Explore Government Health Insurance & Subsidies
        </h2>
        <p className="text-cyan-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
          Verify eligibility for flagship public schemes including Ayushman Bharat (PM-JAY), Telangana Aarogyasri, Central Government Health Scheme (CGHS), and ESIC coverage.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Category Chips */}
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Income Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="text-xs font-semibold text-slate-500">Income Filter:</label>
          <select
            value={incomeFilter}
            onChange={(e) => setIncomeFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            <option value="All">All Eligibility Profiles</option>
            <option value="bpl">BPL / Food Security Cardholders</option>
          </select>
        </div>

      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {schemes.map((scheme) => {
          const badge = getDataModeBadge(scheme.data_mode);
          return (
            <div
              key={scheme.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                
                {/* Title & Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                        {scheme.category}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {scheme.name}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Coverage Limit</span>
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatINR(scheme.coverage_limit)}
                    </div>
                    <span className="text-[10px] text-slate-400">/ family / year</span>
                  </div>
                </div>

                {/* Eligibility Summary */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Eligibility Criteria:</span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {scheme.eligibility_summary}
                  </p>
                </div>

                {/* Covered Specialties */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Covered Medical Disciplines
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {scheme.covered_specialties?.map((spec) => (
                      <span
                        key={spec}
                        className="text-xs px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Claim Process */}
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    How to Claim / Cashless Procedure:
                  </span>
                  <p className="leading-relaxed">{scheme.claim_process_summary}</p>
                </div>

              </div>

              {/* Official Link */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 text-[11px]">Official Government Portal</span>
                <a
                  href={scheme.official_portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                >
                  Visit Portal
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
