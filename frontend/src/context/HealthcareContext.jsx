import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../api/client';

const HealthcareContext = createContext();

const INITIAL_PLAN = {
  treatment: "Angioplasty (PTCA with Stenting)",
  procedureId: "angioplasty",
  city: "Hyderabad",
  roomType: "Semi-Private",
  stayDays: 3,
  costMin: 120000,
  costMax: 250000,
  averageCost: 185000,
  coverageLimit: 500000,
  schemeName: "Ayushman Bharat (PM-JAY) & Aarogyasri",
  estimatedOutOfPocketMin: 0,
  estimatedOutOfPocketMax: 35000,
  hospitalId: "hosp-hyd-01",
  hospitalName: "Apollo Health City, Jubilee Hills",
  hospitalRating: 4.7,
  hospitalDistance: 4.2,
  hospitalCostRange: "₹1.8L - ₹2.5L",
  isCoveredUnderScheme: true,
  checklist: {
    identityVerified: true,
    diagnosticsReady: true,
    deskConsulted: false,
    preAuthSubmitted: false
  },
  savedAt: new Date().toISOString()
};

export function HealthcareProvider({ children }) {
  const [city, setCity] = useState("Hyderabad");
  const [plan, setPlan] = useState(() => {
    try {
      const saved = localStorage.getItem("carenav_patient_plan");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_PLAN;
  });

  const [globalSearch, setGlobalSearch] = useState("");
  const [backendHealth, setBackendHealth] = useState(null);
  const [selectedHospitalForBooking, setSelectedHospitalForBooking] = useState(null);
  const [activeHospitalDetails, setActiveHospitalDetails] = useState(null);
  const [eligibilityModalScheme, setEligibilityModalScheme] = useState(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("carenav_patient_plan", JSON.stringify(plan));
    } catch {
      // ignore
    }
  }, [plan]);

  useEffect(() => {
    async function check() {
      const health = await ApiClient.checkHealth();
      setBackendHealth(health);
    }
    check();
    const interval = setInterval(check, 20000);
    return () => clearInterval(interval);
  }, []);

  const updatePlan = (updates) => {
    setPlan(prev => {
      const next = { ...prev, ...updates, savedAt: new Date().toISOString() };
      // auto calculate out of pocket
      if (updates.costMin !== undefined || updates.costMax !== undefined || updates.coverageLimit !== undefined) {
        const cMin = updates.costMin !== undefined ? updates.costMin : prev.costMin;
        const cMax = updates.costMax !== undefined ? updates.costMax : prev.costMax;
        const cov = updates.coverageLimit !== undefined ? updates.coverageLimit : prev.coverageLimit;
        
        // If covered, out of pocket is typically room rent differential or consumables
        if (cov >= cMax) {
          next.estimatedOutOfPocketMin = 0;
          next.estimatedOutOfPocketMax = Math.round(cMax * 0.15); // room/consumables differential
        } else {
          next.estimatedOutOfPocketMin = Math.max(0, cMin - cov);
          next.estimatedOutOfPocketMax = Math.max(0, cMax - cov);
        }
      }
      return next;
    });
  };

  const toggleChecklist = (key) => {
    setPlan(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [key]: !prev.checklist?.[key]
      }
    }));
  };

  const resetPlan = () => {
    setPlan({ ...INITIAL_PLAN, city, savedAt: new Date().toISOString() });
  };

  return (
    <HealthcareContext.Provider value={{
      city,
      setCity,
      plan,
      updatePlan,
      toggleChecklist,
      resetPlan,
      globalSearch,
      setGlobalSearch,
      backendHealth,
      selectedHospitalForBooking,
      setSelectedHospitalForBooking,
      activeHospitalDetails,
      setActiveHospitalDetails,
      eligibilityModalScheme,
      setEligibilityModalScheme,
      disclaimerOpen,
      setDisclaimerOpen
    }}>
      {children}
    </HealthcareContext.Provider>
  );
}

export function useHealthcare() {
  const context = useContext(HealthcareContext);
  if (!context) {
    throw new Error("useHealthcare must be used within a HealthcareProvider");
  }
  return context;
}

