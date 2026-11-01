import React, { useState } from 'react';
import { HealthcareProvider, useHealthcare } from './context/HealthcareContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import EmergencyBanner from './components/EmergencyBanner';
import DisclaimerModal from './components/DisclaimerModal';
import AppointmentModal from './components/AppointmentModal';
import HospitalDetailModal from './components/HospitalDetailModal';
import EligibilityModal from './components/EligibilityModal';

// Screens
import OverviewScreen from './screens/OverviewScreen';
import NavigatorScreen from './screens/NavigatorScreen';
import HospitalsScreen from './screens/HospitalsScreen';
import EstimatorScreen from './screens/EstimatorScreen';
import SchemesScreen from './screens/SchemesScreen';
import PlanScreen from './screens/PlanScreen';
import AboutScreen from './screens/AboutScreen';

function MainApp() {
  const [activeScreen, setActiveScreen] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmergency, setShowEmergency] = useState(true);

  const { disclaimerOpen, setDisclaimerOpen } = useHealthcare();

  const getScreenTitle = (screen) => {
    switch (screen) {
      case 'overview': return 'Overview';
      case 'navigator': return 'AI Healthcare Navigator';
      case 'hospitals': return 'Find Hospitals';
      case 'estimator': return 'Treatment Cost Estimator';
      case 'schemes': return 'Government Healthcare Schemes';
      case 'plan': return 'My Healthcare Plan';
      case 'about': return 'About & Data Sources';
      default: return 'Healthcare Platform';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-700">
      
      {/* 1. Left Sidebar (Fixed on Desktop, Drawer on Mobile) */}
      <Sidebar
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all">
        
        {/* Top Header */}
        <Header
          activeScreenTitle={getScreenTitle(activeScreen)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Emergency Alert Banner */}
        {showEmergency && (
          <EmergencyBanner onDismiss={() => setShowEmergency(false)} />
        )}

        {/* Main Workspace Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {activeScreen === 'overview' && (
            <OverviewScreen onNavigate={(screen) => setActiveScreen(screen)} />
          )}

          {activeScreen === 'navigator' && (
            <NavigatorScreen onNavigate={(screen) => setActiveScreen(screen)} />
          )}

          {activeScreen === 'hospitals' && (
            <HospitalsScreen onNavigate={(screen) => setActiveScreen(screen)} />
          )}

          {activeScreen === 'estimator' && (
            <EstimatorScreen onNavigate={(screen) => setActiveScreen(screen)} />
          )}

          {activeScreen === 'schemes' && (
            <SchemesScreen onNavigate={(screen) => setActiveScreen(screen)} />
          )}

          {activeScreen === 'plan' && (
            <PlanScreen onNavigate={(screen) => setActiveScreen(screen)} />
          )}

          {activeScreen === 'about' && (
            <AboutScreen onNavigate={(screen) => setActiveScreen(screen)} />
          )}
        </main>

        {/* Subtle SaaS Footer */}
        <footer className="py-5 px-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">CareNav AI</span>
            <span>•</span>
            <span>AI-Powered Healthcare Navigation Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDisclaimerOpen(true)}
              className="hover:text-emerald-600 transition-colors"
            >
              Clinical & Simulation Disclaimers
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveScreen('about')}
              className="hover:text-emerald-600 transition-colors"
            >
              Data Provenance
            </button>
          </div>
        </footer>

      </div>

      {/* 3. Global Modals */}
      <AppointmentModal />
      <HospitalDetailModal />
      <EligibilityModal />
      <DisclaimerModal
        isOpen={disclaimerOpen}
        onClose={() => setDisclaimerOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <HealthcareProvider>
      <MainApp />
    </HealthcareProvider>
  );
}
