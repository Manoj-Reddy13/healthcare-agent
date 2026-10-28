import React from 'react';
import { Award, CalendarCheck, MapPin, Phone, Shield, Star } from 'lucide-react';
import { formatINR, getDataModeBadge } from '../utils/formatters';

export default function HospitalCard({ hospital, onSelectBook }) {
  const badge = getDataModeBadge(hospital.data_mode);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <div className="p-5 space-y-4">
        
        {/* Header: Name, City, Badges */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                {badge.label}
              </span>
              {hospital.accreditation?.map((acc) => (
                <span
                  key={acc}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                >
                  <Award className="w-3 h-3 text-amber-500" />
                  {acc}
                </span>
              ))}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {hospital.name}
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{hospital.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Address & Contact */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>{hospital.address}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span>{hospital.phone}</span>
            </div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
              ~{hospital.distance_km} km away
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            Key Departments
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hospital.specialties?.map((spec) => (
              <span
                key={spec}
                className="text-xs px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Indicative Costs Grid */}
        {hospital.indicative_costs && Object.keys(hospital.indicative_costs).length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Indicative Benchmarks
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(hospital.indicative_costs).slice(0, 4).map(([proc, cost]) => (
                <div key={proc} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-600 dark:text-slate-400 truncate text-[11px]">{proc}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatINR(cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted Schemes */}
        {hospital.accepted_schemes && hospital.accepted_schemes.length > 0 && (
          <div className="pt-1">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              Covered Schemes
            </p>
            <div className="flex flex-wrap gap-1">
              {hospital.accepted_schemes.map((scheme) => (
                <span
                  key={scheme}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/50"
                >
                  {scheme}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer Action */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-500 italic">
          Educational simulation
        </span>
        <button
          onClick={() => onSelectBook(hospital)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-sm"
        >
          <CalendarCheck className="w-4 h-4" />
          Simulate Booking
        </button>
      </div>
    </div>
  );
}
