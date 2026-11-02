import React, { useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Download,
  Info,
  MapPin,
  Menu,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  X
} from 'lucide-react';
import { useHealthcare } from '../context/HealthcareContext';

export default function Header({ activeScreenTitle, onToggleSidebar, onOpenAiSummary }) {
  const { city, setCity, setDisclaimerOpen } = useHealthcare();
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const LOCATIONS = [
    { id: 'Hyderabad', label: 'Hyderabad, Telangana', state: 'Telangana' },
    { id: 'Bengaluru', label: 'Bengaluru, Karnataka', state: 'Karnataka' },
    { id: 'Mumbai', label: 'Mumbai, Maharashtra', state: 'Maharashtra' },
    { id: 'Jaipur', label: 'Jaipur, Rajasthan', state: 'Rajasthan' },
    { id: 'All', label: 'All India (36 States)', state: 'All' }
  ];

  const NOTIFICATIONS = [
    {
      id: 1,
      title: 'MoHFW Hospital Registry Updated',
      desc: '30,273 healthcare facilities verified with state and district indexing.',
      time: 'Verified',
      tag: 'Registry'
    },
    {
      id: 2,
      title: 'PM-JAY Senior Citizen Universal Cover',
      desc: 'Rs. 5,00,000 top-up cashless cover active for seniors aged 70+.',
      time: 'Policy',
      tag: 'Ayushman'
    },
    {
      id: 3,
      title: 'Aarogyasri Cardiac Package Revisions',
      desc: 'Tertiary cashless packages updated for cardiac and oncology procedures.',
      time: 'Tariff',
      tag: 'Telangana'
    }
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between transition-colors">
      
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {activeScreenTitle}
          </h1>
          <span className="hidden md:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            CareNav Cloud
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Global Search Pill with Keyboard Shortcut */}
        <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-500 w-52 lg:w-64 focus-within:border-teal-500 focus-within:bg-white transition-all">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CareNav..."
            className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Location Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setShowCityMenu(!showCityMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 border border-slate-200 transition-colors shadow-2xs"
          >
            <MapPin className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">{city === 'All' ? 'All India' : city}</span>
            <span className="sm:hidden">{city}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {showCityMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fade-in">
              <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Select Region
              </div>
              {LOCATIONS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCity(c.id);
                    setShowCityMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    city === c.id ? 'text-teal-700 font-bold bg-teal-50/60' : 'text-slate-700'
                  }`}
                >
                  <span>{c.label}</span>
                  {city === c.id && <Check className="w-3.5 h-3.5 text-teal-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Hotline Button */}
        <a
          href="tel:108"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors"
          title="National Emergency Ambulance Service"
        >
          <PhoneCall className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
          <span>108 Emergency</span>
        </a>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-teal-500 absolute top-2 right-2 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-xs text-slate-900">Healthcare Updates</span>
                <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
                  Official MoHFW
                </span>
              </div>
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{n.title}</span>
                      <span className="text-[9px] font-semibold text-slate-400">{n.tag}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            CN
          </div>
          <div className="hidden xl:block text-left text-xs leading-tight">
            <div className="font-bold text-slate-900">CareNav User</div>
            <div className="text-[10px] text-slate-400">Clinical Pilot</div>
          </div>
        </div>

      </div>

    </header>
  );
}
