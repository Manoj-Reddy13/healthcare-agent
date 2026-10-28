import React from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, X } from 'lucide-react';

export default function EmergencyBanner({ onDismiss }) {
  return (
    <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white shadow-lg animate-pulse-subtle">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <ShieldAlert className="w-6 h-6 text-white" />
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                Medical Emergency Assistance
                <span className="text-xs uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded-full">Immediate Action</span>
              </h3>
              <p className="text-xs sm:text-sm text-rose-100">
                Experiencing chest pain, severe shortness of breath, sudden weakness, or heavy trauma? Do not delay for a chatbot search.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="tel:108"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-rose-700 font-bold text-sm rounded-lg shadow-sm hover:bg-rose-50 transition-all hover:scale-105 active:scale-95"
            >
              <PhoneCall className="w-4 h-4" />
              Call 108 (Ambulance)
            </a>
            <a
              href="tel:112"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 text-white font-medium text-sm rounded-lg hover:bg-black/40 transition-colors"
            >
              Call 112 (National ER)
            </a>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
