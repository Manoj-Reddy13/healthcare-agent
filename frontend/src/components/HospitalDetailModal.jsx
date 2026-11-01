import React from 'react';
import {
  Award,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  X
} from 'lucide-react';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR } from '../utils/formatters';

export default function HospitalDetailModal() {
  const { activeHospitalDetails, setActiveHospitalDetails, setSelectedHospitalForBooking } = useHealthcare();

  if (!activeHospitalDetails) return null;

  const hosp = activeHospitalDetails;
  const isGov = hosp.name.toLowerCase().includes("nims") || hosp.name.toLowerCase().includes("government") || hosp.name.toLowerCase().includes("osmania") || hosp.hospital_type === "Government";
  const mapsUrl = hosp.directions_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + " " + hosp.address)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setActiveHospitalDetails(null)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                isGov
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
              }`}>
                {isGov ? 'Government Autonomous Institute' : (hosp.hospital_type || 'Private Tertiary Hospital')}
              </span>

              {hosp.accreditation?.map((acc) => (
                <span
                  key={acc}
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                >
                  {acc} Certified
                </span>
              ))}

              <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <span>{hosp.rating?.toFixed(1) || '4.5'}</span>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
              {hosp.name}
            </h2>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{hosp.address}</span>
              {hosp.pincode && (
                <span className="font-bold text-slate-700 dark:text-slate-300">(PIN: {hosp.pincode})</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveHospitalDetails(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact & Map Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Helpline:</span>
            </div>
            <a
              href={`tel:${hosp.phone}`}
              className="font-bold text-emerald-600 hover:underline"
            >
              {hosp.phone || '040-2360 7777'}
            </a>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
          >
            <Navigation className="w-4 h-4 text-emerald-600" />
            <span>Open Directions on Google Maps</span>
            <ExternalLink className="w-3 h-3 text-emerald-500" />
          </a>
        </div>

        {/* Available Facilities */}
        {hosp.facilities && hosp.facilities.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Available Hospital Facilities & Infrastructure</span>
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {hosp.facilities.map((fac) => (
                <span
                  key={fac}
                  className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{fac}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Clinical Specialties */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            <span>Clinical Departments & Specialties</span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {hosp.specialties?.map((spec) => (
              <span
                key={spec}
                className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Empaneled Schemes */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Accepted Government & Insurance Schemes</span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {hosp.accepted_schemes?.map((sch) => (
              <span
                key={sch}
                className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                <span>{sch}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Indicative Tariff Benchmarks Schedule */}
        {hosp.indicative_costs && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Indicative Procedure Rates at {hosp.name}
            </h3>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs overflow-hidden">
              {Object.entries(hosp.indicative_costs).map(([proc, cost]) => (
                <div key={proc} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{proc}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatINR(cost)}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              * Rates are indicative benchmarks based on regional published tariff observations. Actual hospital charges depend on surgeon fees, length of ICU stay, and clinical requirements.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Source: {hosp.data_source || 'Verified Portals'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveHospitalDetails(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={() => {
                const target = hosp;
                setActiveHospitalDetails(null);
                setSelectedHospitalForBooking(target);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
            >
              Book Simulated Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
