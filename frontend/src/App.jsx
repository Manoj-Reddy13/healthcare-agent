import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import EmergencyBanner from './components/EmergencyBanner';
import ChatInterface from './components/ChatInterface';
import HospitalDirectory from './components/HospitalDirectory';
import CostEstimator from './components/CostEstimator';
import SchemeExplorer from './components/SchemeExplorer';
import AppointmentModal from './components/AppointmentModal';
import DisclaimerModal from './components/DisclaimerModal';
import { ApiClient } from './api/client';
import { ShieldCheck, Stethoscope } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [showEmergency, setShowEmergency] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [selectedHospitalForBooking, setSelectedHospitalForBooking] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);

  useEffect(() => {
    async function checkStatus() {
      const health = await ApiClient.checkHealth();
      setBackendHealth(health);
    }
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleBookHospital = (hospital) => {
    setSelectedHospitalForBooking(hospital);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors">
      
      {/* Emergency Alert Banner */}
      {showEmergency && (
        <EmergencyBanner onDismiss={() => setShowEmergency(false)} />
      )}

      {/* Main Header / Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDisclaimer={() => setShowDisclaimer(true)}
        backendHealth={backendHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'chat' && (
          <ChatInterface onSelectBookHospital={handleBookHospital} />
        )}

        {activeTab === 'hospitals' && (
          <HospitalDirectory onSelectBookHospital={handleBookHospital} />
        )}

        {activeTab === 'costs' && (
          <CostEstimator />
        )}

        {activeTab === 'schemes' && (
          <SchemeExplorer />
        )}
      </main>

      {/* Modals */}
      <AppointmentModal
        hospital={selectedHospitalForBooking}
        isOpen={Boolean(selectedHospitalForBooking)}
        onClose={() => setSelectedHospitalForBooking(null)}
      />

      <DisclaimerModal
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Healthcare Cost & Care Navigation Agent
            </span>
            <span className="text-slate-400">| Member 1 (React) & Member 2 (AI Agent)</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDisclaimer(true)}
              className="hover:text-emerald-600 transition-colors flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Disclaimer & Simulation Safety
            </button>
            <span>•</span>
            <span>FastAPI + Vite + React + Tailwind</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
