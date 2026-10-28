import React, { useState } from 'react';
import { AlertCircle, CalendarCheck, CheckCircle2, Clock, Loader2, ShieldAlert, X } from 'lucide-react';
import { ApiClient } from '../api/client';

export default function AppointmentModal({ hospital, isOpen, onClose }) {
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_phone: '',
    specialty: hospital?.specialties?.[0] || 'Cardiology',
    preferred_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    notes: '',
    user_confirmed: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  if (!isOpen || !hospital) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_confirmed) {
      setError("Please check the explicit confirmation checkbox to proceed with the educational simulation.");
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
    } catch (err) {
      setError(err.message || "Unable to register simulated appointment.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setResult(null);
    setError(null);
    setFormData({
      patient_name: '',
      patient_phone: '',
      specialty: hospital?.specialties?.[0] || 'Cardiology',
      preferred_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      notes: '',
      user_confirmed: false,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={resetAndClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
              <h2 id="modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                Simulated Care Request
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Target Facility: <span className="font-semibold text-slate-800 dark:text-slate-200">{hospital.name}</span>
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice of Simulation */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong>Educational Demonstration Notice:</strong> This appointment request is strictly simulated. No actual clinical booking or doctor reservation will be made.
          </p>
        </div>

        {/* Success View */}
        {result ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-emerald-900 dark:text-emerald-100">
                Simulated Booking Registered
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                Confirmation ID: {result.confirmation_id}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-xs space-y-2 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{result.patient_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-500">Department:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{result.specialty}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-500">Simulated Date:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{result.preferred_date}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-emerald-600 uppercase tracking-wider">{result.status}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center">
              {result.instructions}
            </p>

            <button
              onClick={resetAndClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Patient Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.patient_phone}
                  onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Specialty
                </label>
                <select
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  {hospital.specialties?.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preferred Consultation Date *
              </label>
              <input
                type="date"
                required
                value={formData.preferred_date}
                onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Optional Clinical Notes
              </label>
              <textarea
                rows={2}
                placeholder="Mention specific symptoms, prior doctor referrals, or scheme card details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            {/* Explicit Confirmation Checkbox (Safety Enforcement) */}
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={formData.user_confirmed}
                onChange={(e) => setFormData({ ...formData, user_confirmed: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-normal">
                <strong>Explicit Confirmation:</strong> I understand this is an educational mock simulation and that no real hospital booking is made.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.user_confirmed}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Simulated Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
