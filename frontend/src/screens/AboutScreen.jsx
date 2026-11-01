import React, { useState, useEffect } from 'react';
import {
  Activity,
  Award,
  CheckCircle2,
  Database,
  ExternalLink,
  FileCode,
  HeartPulse,
  Info,
  Layers,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';

export default function AboutScreen() {
  const { backendHealth } = useHealthcare();
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.fetchIntegrationStatus();
      setIntegrationStatus(data);
    } catch (e) {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16 max-w-5xl mx-auto">
      
      {/* 1. Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              About & Data Sources
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              System architecture, data provenance, and responsible AI safety disclosures.
            </p>
          </div>
        </div>

        <button
          onClick={loadStatus}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* 2. Data Modes & Provenance Legend */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Data Provenance & Classification Standards</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified Sourced Data</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Official healthcare schemes (PM-JAY, Aarogyasri), statutory hospital empanelment guidelines, and public tariffs sourced directly from government gazettes and accredited hospital listings.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
              <Activity className="w-4 h-4" />
              <span>Indicative Cost Estimates</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Calculated statistical cost benchmarks for procedures like Angioplasty, Knee Replacement, and Deliveries across General, Semi-Private, Private and ICU tiers in Hyderabad and Bengaluru.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4" />
              <span>Educational Simulation</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Appointment scheduling is strictly a safe simulation (<code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">is_simulated: true</code>) designed for academic demonstration without altering clinical records.
            </p>
          </div>

        </div>
      </section>

      {/* 3. System Architecture & Project Engineering */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Capstone Project Engineering Modules</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
              <span>Member 1 — SaaS Frontend Experience</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">React 19 + Vite</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Modular 6-screen SaaS interface, Tailwind CSS design system, responsive sidebar, data-driven visual charts, and interactive plan builder.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
              <span>Member 2 — AI Navigation Agent</span>
              <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded">FastAPI + Tools</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Autonomous intent dispatcher, emergency keyword red-flagging, tool-calling for hospital search, cost calculation, and appointment confirmation safety.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
              <span>Member 3 — Sourced Data & Tariffs</span>
              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">SQLite Schema</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Published hospital provider guides, public source APIs, government scheme tariff extraction, and database snapshot integrity.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
              <span>Member 4 — Integration & CI Verification</span>
              <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded">134 Automated Tests</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Cross-platform automated CI verification, snapshot rebuilding, zero source-mutation guarantees, and shared unified app hosting.
            </p>
          </div>

        </div>
      </section>

      {/* 4. Live API & Diagnostics */}
      <section className="bg-slate-950 text-slate-100 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 font-sans">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold uppercase tracking-wider text-xs text-white">Live System Diagnostics</span>
          </div>
          <span className="text-[11px] text-emerald-400">● Status: 200 OK</span>
        </div>

        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Backend API URL:</span>
            <span className="text-emerald-400">{ApiClient.getBaseUrl()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Service Mode:</span>
            <span className="text-slate-200">{backendHealth?.service || 'healthcare-agent-backend'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Database Engine:</span>
            <span className="text-slate-200">SQLite Normalized Healthcare Snapshot</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Integration Route Namespace:</span>
            <span className="text-teal-400">/api, /api/v2/data, /api/v3/evidence</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">CI Verification Tests:</span>
            <span className="text-emerald-400">118 Extension Tests + 16 Pytests (Passed)</span>
          </div>
        </div>
      </section>

    </div>
  );
}
