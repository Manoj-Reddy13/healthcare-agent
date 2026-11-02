import React from 'react';
import {
  Activity,
  Bot,
  Building2,
  Calculator,
  ChevronRight,
  ClipboardList,
  Database,
  ExternalLink,
  HeartPulse,
  Info,
  LayoutDashboard,
  Network,
  Shield,
  ShieldCheck,
  Stethoscope,
  X
} from 'lucide-react';
import { useHealthcare } from '../context/HealthcareContext';

export const NAV_GROUPS = [
  {
    title: 'GENERAL',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, badge: null },
      { id: 'hospitals', label: 'Hospital Directory', icon: Building2, badge: '30k+' },
      { id: 'diseases', label: 'Disease & Treatments', icon: Stethoscope, badge: null }
    ]
  },
  {
    title: 'INSURANCE & COSTS',
    items: [
      { id: 'insurance', label: 'Insurance Explorer', icon: ShieldCheck, badge: 'IRDAI' },
      { id: 'network', label: 'Cashless Network Match', icon: Network, badge: null },
      { id: 'estimator', label: 'Cost Estimator', icon: Calculator, badge: null }
    ]
  },
  {
    title: 'PROGRAMS & AI',
    items: [
      { id: 'schemes', label: 'Government Schemes', icon: Shield, badge: 'PM-JAY' },
      { id: 'navigator', label: 'AI Navigator', icon: Bot, badge: 'Agent' },
      { id: 'plan', label: 'My Healthcare Plan', icon: ClipboardList, badge: null }
    ]
  },
  {
    title: 'DATA PROVENANCE',
    items: [
      { id: 'about', label: 'Data Sources & Registry', icon: Database, badge: 'Verified' }
    ]
  }
];

export default function Sidebar({ activeScreen, setActiveScreen, isOpen, onClose }) {
  const { backendHealth } = useHealthcare();
  const isHealthy = backendHealth?.status === 'healthy' || backendHealth?.status === 'mock';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Floating White Enterprise Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
                <HeartPulse className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-slate-900 tracking-tight">
                    CareNav
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Healthcare Intelligence
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grouped Nav List */}
          <div className="p-3.5 space-y-5">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveScreen(item.id);
                        if (onClose) onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-white'
                              : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Right Notch Indicator when Active */}
                      {isActive && (
                        <span className="w-1.5 h-4 bg-teal-300 rounded-full absolute -right-1 top-1/2 -translate-y-1/2" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Registry Status Strip */}
        <div className="p-4 border-t border-slate-100 space-y-2.5 bg-slate-50/50">
          <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl text-xs border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-bold text-slate-800 text-[11px]">
                {backendHealth?.service || 'CareNav Backend'}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">
              30,273 DB
            </span>
          </div>

          <div className="px-1 text-[10px] text-slate-400 flex items-center justify-between">
            <span>NHP Registry Active</span>
            <span>v1.2 SaaS</span>
          </div>
        </div>
      </aside>
    </>
  );
}
