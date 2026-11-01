import React from 'react';
import {
  Activity,
  Bot,
  Building2,
  Calculator,
  ChevronRight,
  ClipboardList,
  Database,
  HeartPulse,
  Info,
  LayoutDashboard,
  Network,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  X
} from 'lucide-react';
import { useHealthcare } from '../context/HealthcareContext';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
  { id: 'hospitals', label: 'Find Hospitals', icon: Building2, badge: null },
  { id: 'diseases', label: 'Diseases & Treatments', icon: Stethoscope, badge: null },
  { id: 'insurance', label: 'Insurance Explorer', icon: ShieldCheck, badge: 'IRDAI' },
  { id: 'network', label: 'Hospital-Insurance Match', icon: Network, badge: 'Cashless' },
  { id: 'estimator', label: 'Cost & OOP Estimator', icon: Calculator, badge: null },
  { id: 'schemes', label: 'Govt Schemes', icon: LandmarkIcon, badge: 'PM-JAY' },
  { id: 'navigator', label: 'AI Navigator', icon: Bot, badge: 'AI' },
  { id: 'plan', label: 'My Healthcare Plan', icon: ClipboardList, badge: null },
  { id: 'about', label: 'About & Data Sources', icon: Database, badge: null }
];

function LandmarkIcon(props) {
  return <ShieldCheck {...props} />;
}

export default function Sidebar({ activeScreen, setActiveScreen, isOpen, onClose }) {
  const { backendHealth, setDisclaimerOpen } = useHealthcare();

  const isHealthy = backendHealth?.status === 'healthy' || backendHealth?.status === 'mock';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Platform Identity */}
        <div>
          <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                <HeartPulse className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                    CareNav
                  </span>
                  <span className="text-xs font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    AI
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">
                  Healthcare Care & Navigation
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveScreen(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Connection Status & Academic Simulation Notice */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          {/* Status Chip */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                {backendHealth?.service || 'FastAPI Service'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {backendHealth?.version || 'v1.0'}
            </span>
          </div>

          {/* Academic Simulation Warning */}
          <button
            onClick={() => setDisclaimerOpen(true)}
            className="w-full text-left p-2.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-medium">Simulation Safety Notice</span>
            </div>
            <ChevronRight className="w-3 h-3 text-amber-500" />
          </button>
        </div>
      </aside>
    </>
  );
}

