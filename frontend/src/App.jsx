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
import DiseaseExplorerScreen from './screens/DiseaseExplorerScreen';
import InsuranceExplorerScreen from './screens/InsuranceExplorerScreen';
import NetworkScreen from './screens/NetworkScreen';

function MainApp() {
  const [activeScreen, setActiveScreen] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false); // default off to prevent clutter

  const { disclaimerOpen, setDisclaimerOpen } = useHealthcare();

  const getScreenTitle = (screen) => {
    switch (screen) {
      case 'overview': return 'Overview Dashboard';
      case 'navigator': return 'AI Healthcare Navigator';
      case 'hospitals': return 'Hospital Directory';
      case 'diseases': return 'Disease & Treatment Explorer';
      case 'insurance': return 'Health Insurance Policy Explorer';
      case 'network': return 'Hospital–Insurance Cashless Network';
      case 'estimator': return 'Treatment Cost Estimator';
      case 'schemes': return 'Government Healthcare Schemes';
      case 'plan': return 'My Healthcare Plan';
      case 'about': return 'Data Sources & Provenance';
      default: return 'Healthcare Platform';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex font-sans antialiased text-[#0F172A] selection:bg-teal-500/20 selection:text-teal-900">
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

          {activeScreen === 'diseases' && (
            <DiseaseExplorerScreen onNavigate={(screen) => setActiveScreen(screen)} />
          )}

          {activeScreen === 'insurance' && (
            <InsuranceExplorerScreen onNavigate={(screen) => setActiveScreen(screen)} />
          )}

          {activeScreen === 'network' && (
            <NetworkScreen onNavigate={(screen) => setActiveScreen(screen)} />
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
        <footer className="py-5 px-6 border-t border-slate-200 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-700">CareNav AI</span>
            <span>•</span>
            <span>AI-Powered Healthcare Navigation Platform</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDisclaimerOpen(true)}
              className="hover:text-teal-600 transition-colors font-medium"
            >
              Clinical & Simulation Disclaimers
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveScreen('about')}
              className="hover:text-teal-600 transition-colors font-medium"
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
