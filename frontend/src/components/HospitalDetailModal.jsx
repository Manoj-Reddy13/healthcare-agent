import React from 'react';
import {
  Award,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  Globe,
  Info,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X
} from 'lucide-react';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR } from '../utils/formatters';

export default function HospitalDetailModal() {
  const { activeHospitalDetails, setActiveHospitalDetails, setSelectedHospitalForBooking } = useHealthcare();

  if (!activeHospitalDetails) return null;

  const hosp = activeHospitalDetails;
  const isGov = (hosp.category || hosp.hospital_type || "").toLowerCase().includes("government") ||
    (hosp.category || hosp.hospital_type || "").toLowerCase().includes("public") ||
    hosp.name.toLowerCase().includes("government") ||
    hosp.name.toLowerCase().includes("nims") ||
    hosp.name.toLowerCase().includes("osmania") ||
    hosp.hospital_type === "Government";

  const mapsUrl = hosp.directions_url ||
    (hosp.latitude && hosp.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${hosp.latitude},${hosp.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + " " + (hosp.address || hosp.district || ""))}`);

  const phoneDisplay = hosp.telephone && hosp.telephone !== "Not available"
    ? hosp.telephone
    : (hosp.phone && hosp.phone !== "Not available" ? hosp.phone : (hosp.mobile_number && hosp.mobile_number !== "Not available" ? hosp.mobile_number : "Not available"));

  const hasAccreditation = Array.isArray(hosp.accreditation)
    ? hosp.accreditation.length > 0 && hosp.accreditation[0] !== "Not available" && hosp.accreditation[0] !== "0"
    : (hosp.accreditation && hosp.accreditation !== "Not available" && hosp.accreditation !== "0");

  const accreditationList = Array.isArray(hosp.accreditation)
    ? hosp.accreditation.filter(a => a && a !== "Not available" && a !== "0")
    : (hasAccreditation ? [hosp.accreditation] : []);

  const hasSpecialties = hosp.specialties && hosp.specialties.length > 0;
  const hasFacilities = hosp.facilities && hosp.facilities.length > 0;
  const hasSchemes = (hosp.accepted_schemes && hosp.accepted_schemes.length > 0) || (hosp.empanelled_schemes && hosp.empanelled_schemes.length > 0);
  const schemeList = hosp.accepted_schemes || hosp.empanelled_schemes || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      onClick={() => setActiveHospitalDetails(null)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                isGov
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {hosp.category || (isGov ? 'Public / Government' : (hosp.hospital_type || 'Private'))}
              </span>

              {hosp.care_type && hosp.care_type !== "Not available" && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {hosp.care_type}
                </span>
              )}

              {hasAccreditation ? (
                accreditationList.map((acc) => (
                  <span
                    key={acc}
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    {acc} Certified
                  </span>
                ))
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Accreditation: Not available
                </span>
              )}

              {hosp.total_beds && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {hosp.total_beds} Beds
                </span>
              )}

              {hosp.established_year && (
                <span className="text-[10px] font-medium text-slate-400">
                  Est. {hosp.established_year}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {hosp.name}
            </h2>

            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{hosp.address || `${hosp.district || ''}, ${hosp.state || ''}`}</span>
              {hosp.pincode && hosp.pincode !== "Not available" && (
                <span className="font-bold text-slate-700">PIN: {hosp.pincode}</span>
              )}
              {hosp.state && (
                <span className="text-slate-400">| State: {hosp.state}</span>
              )}
              {hosp.district && (
                <span className="text-slate-400">| District: {hosp.district}</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveHospitalDetails(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact Directory Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <Phone className="w-3.5 h-3.5 text-teal-600" />
              <span>Telephone:</span>
            </div>
            {phoneDisplay !== "Not available" ? (
              <a href={`tel:${phoneDisplay}`} className="text-xs font-bold text-teal-700 hover:underline block truncate">
                {phoneDisplay}
              </a>
            ) : (
              <span className="text-xs text-slate-400">Not available</span>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <Phone className="w-3.5 h-3.5 text-rose-500" />
              <span>Emergency / Casualty:</span>
            </div>
            {hosp.emergency_num && hosp.emergency_num !== "Not available" ? (
              <a href={`tel:${hosp.emergency_num}`} className="text-xs font-bold text-rose-600 hover:underline block truncate">
                {hosp.emergency_num}
              </a>
            ) : (
              <span className="text-xs text-slate-400">Not available</span>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <Phone className="w-3.5 h-3.5 text-blue-500" />
              <span>Ambulance Service:</span>
            </div>
            <a href="tel:108" className="text-xs font-bold text-blue-600 hover:underline block">
              {hosp.ambulance_phone && hosp.ambulance_phone !== "Not available" ? hosp.ambulance_phone : "108 (National)"}
            </a>
          </div>

          {hosp.website && hosp.website !== "Not available" && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                <span>Official Website:</span>
              </div>
              <a href={hosp.website.startsWith('http') ? hosp.website : `https://${hosp.website}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-teal-700 hover:underline block truncate">
                {hosp.website}
              </a>
            </div>
          )}

          {hosp.email && hosp.email !== "Not available" && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Email:</span>
              </div>
              <a href={`mailto:${hosp.email}`} className="text-xs font-bold text-indigo-600 hover:underline block truncate">
                {hosp.email}
              </a>
            </div>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center gap-2 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors"
          >
            <Navigation className="w-4 h-4 text-teal-600" />
            <span>Google Maps Directions</span>
            <ExternalLink className="w-3 h-3 text-teal-600" />
          </a>
        </div>

        {/* Clinical Specialties */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            <span>Clinical Departments & Specialties</span>
          </h3>
          {hasSpecialties ? (
            <div className="flex items-center gap-2 flex-wrap">
              {hosp.specialties.map((spec) => (
                <span
                  key={spec}
                  className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 text-slate-700"
                >
                  {spec}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Specialties not recorded in registry. Please contact hospital reception for current departments.
            </p>
          )}
        </div>

        {/* Available Facilities */}
        {hasFacilities && (
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Available Hospital Facilities</span>
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {hosp.facilities.map((fac) => (
                <span
                  key={fac}
                  className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{fac}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empaneled Schemes */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Government & Insurance Scheme Empanelment</span>
          </h3>
          {hasSchemes ? (
            <div className="flex items-center gap-2 flex-wrap">
              {schemeList.map((sch) => (
                <span
                  key={sch}
                  className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>{sch}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Cashless empanelment (PM-JAY, Aarogyasri, CGHS) not explicitly verified in this open dataset. Please verify with the hospital's TPA / insurance helpdesk prior to admission.
            </p>
          )}
        </div>

        {/* Indicative Tariff Benchmarks Schedule (if available) */}
        {hosp.indicative_costs && Object.keys(hosp.indicative_costs).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Indicative Procedure Rates at {hosp.name}
            </h3>
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs overflow-hidden">
              {Object.entries(hosp.indicative_costs).map(([proc, cost]) => (
                <div key={proc} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <span className="font-medium text-slate-700">{proc}</span>
                  <span className="font-black text-slate-900">{formatINR(cost)}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              * Indicative tariffs based on verified benchmarks. Actual hospital charges depend on surgeon fees, length of ICU stay, and clinical requirements.
            </p>
          </div>
        )}

        {/* Data Provenance Badge */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
            <Info className="w-3.5 h-3.5 text-teal-600" />
            <span>Data Provenance & Registry Verification</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            {hosp.data_source || 'National Health Portal (NHP) Open Government Data CSV (Ministry of Health and Family Welfare)'}
            {hosp.import_date && ` • Import Date: ${hosp.import_date}`}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-mono">
            ID: {hosp.id}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveHospitalDetails(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={() => {
                const target = hosp;
                setActiveHospitalDetails(null);
                setSelectedHospitalForBooking(target);
              }}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Simulate Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
