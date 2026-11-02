import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  ShieldAlert,
  User,
  X
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';

export default function AppointmentModal() {
  const { selectedHospitalForBooking, setSelectedHospitalForBooking, toggleChecklist } = useHealthcare();

  const hospital = selectedHospitalForBooking;

  const [formData, setFormData] = useState({
    patient_name: 'Manoj Kumar Reddy',
    patient_phone: '+91 98765 43210',
    specialty: 'Cardiology',
    preferred_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    notes: 'Simulated demo consultation for cardiac assessment',
    user_confirmed: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (hospital) {
      setFormData(prev => ({
        ...prev,
        specialty: hospital.specialties?.[0] || 'Cardiology',
        preferred_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        user_confirmed: false
      }));
      setResult(null);
      setError(null);
    }
  }, [hospital]);

  if (!hospital) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_confirmed) {
      setError("Please check the explicit simulation confirmation checkbox to proceed.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await ApiClient.confirmAppointment({
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        patient_name: formData.patient_name,
        patient_phone: formData.patient_phone,
        specialty: formData.specialty,
        preferred_date: formData.preferred_date,
        notes: formData.notes,
        user_confirmed: formData.user_confirmed,
      });
      setResult(response);
      toggleChecklist('deskConsulted');
    } catch (err) {
      setError(err.message || "Unable to register simulated appointment.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedHospitalForBooking(null);
    setResult(null);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
              <CalendarCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Book Simulated Appointment
              </h2>
              <p className="text-xs text-slate-500">{hospital.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Academic Safety Warning Banner */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-900 leading-snug">
            <strong>Educational Demonstration Only:</strong> This workflow demonstrates AI agent action-taking. No real slot is reserved at {hospital.name}.
          </div>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                Patient Full Name
              </label>
              <input
                type="text"
                required
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                Contact Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.patient_phone}
                onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Clinical Specialty
                </label>
                <select
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                >
                  {hospital.specialties?.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  {(!hospital.specialties || hospital.specialties.length === 0) && (
                    <option value="General Medicine">General Medicine</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Preferred Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.preferred_date}
                  onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Mandatory User Confirmation Checkbox */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="user_confirmed"
                checked={formData.user_confirmed}
                onChange={(e) => setFormData({ ...formData, user_confirmed: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded mt-0.5"
              />
              <label htmlFor="user_confirmed" className="text-[11px] text-slate-700 cursor-pointer leading-snug">
                I understand this is an educational simulation demonstrating AI booking intent and does not book an actual physical slot.
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !formData.user_confirmed}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
                <span>Confirm Simulated Registration</span>
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Receipt */
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-teal-900">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <span>Simulated Request Registered</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Confirmation ID: <code className="bg-teal-100 text-teal-900 px-1.5 py-0.5 rounded font-mono font-bold">{result.confirmation_id}</code>
              </p>
              <div className="text-[11px] space-y-1 text-slate-700 pt-1">
                <div>Hospital: <strong>{result.hospital_name}</strong></div>
                <div>Department: <strong>{result.specialty}</strong></div>
                <div>Date: <strong>{result.preferred_date}</strong></div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-100">
              {result.instructions || result.message}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
