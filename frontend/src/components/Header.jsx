import React, { useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Info,
  MapPin,
  Menu,
  PhoneCall,
  ShieldCheck,
  User,
  X
} from 'lucide-react';
import { useHealthcare } from '../context/HealthcareContext';

export default function Header({ activeScreenTitle, onToggleSidebar }) {
  const { city, setCity, setDisclaimerOpen } = useHealthcare();
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const CITIES = [
    { id: 'Hyderabad', label: 'Hyderabad, TS', state: 'Telangana' },
    { id: 'Bengaluru', label: 'Bengaluru, KA', state: 'Karnataka' },
  ];

  const NOTIFICATIONS = [
    {
      id: 1,
      title: 'PM-JAY Senior Citizen Coverage',
      desc: 'Universal coverage active for seniors aged 70+ irrespective of income.',
      time: 'Official Update',
      tag: 'Policy'
    },
    {
      id: 2,
      title: 'Aarogyasri Tariff Revisions',
      desc: 'Tertiary cashless packages updated for cardiac and oncology procedures.',
      time: 'Verified',
      tag: 'Tariff'
    },
    {
      id: 3,
      title: 'Simulated Appointments Enabled',
      desc: 'Educational sandbox active for academic capstone demonstration.',
      time: 'System',
      tag: 'Notice'
    }
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between transition-colors">
      
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white hidden sm:block">
          {activeScreenTitle}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Location Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setShowCityMenu(!showCityMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{city === 'Hyderabad' ? 'Hyderabad, TS' : 'Bengaluru, KA'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {showCityMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fade-in">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Select Service City
              </div>
              {CITIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCity(c.id);
                    setShowCityMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    city === c.id ? 'text-emerald-600 font-bold bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{c.label}</span>
                  {city === c.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Emergency SOS Shortcut */}
        <a
          href="tel:108"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-900 transition-colors"
          title="Dial 108 Emergency Medical Services in India"
        >
          <PhoneCall className="w-3 h-3 text-rose-600" />
          <span>Emergency: 108</span>
        </a>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Care Notifications
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.tag}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {n.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-950 text-white font-bold text-xs flex items-center justify-center ring-2 ring-emerald-500/30 hover:ring-emerald-500 transition-all shadow-sm"
          >
            M
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 space-y-3 animate-fade-in text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  M
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Manoj Kumar Reddy</h4>
                  <p className="text-[11px] text-slate-400">Hyderabad, Telangana</p>
                </div>
              </div>

              <div className="space-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between py-1">
                  <span>Demo Profile:</span>
                  <span className="font-semibold text-emerald-600">Active</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Eligible Schemes:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">PM-JAY, Aarogyasri</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowProfile(false);
                  setDisclaimerOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 text-center"
              >
                View Safety & Simulation Details
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

