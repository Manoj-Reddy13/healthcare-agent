import { MOCK_HOSPITALS, MOCK_SCHEMES } from "./mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export class ApiClient {
  static getBaseUrl() {
    return API_BASE_URL;
  }

  static async checkHealth() {
    if (FORCE_MOCK) return { status: "mock", service: "frontend-mock-mode" };
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return await res.json();
    } catch {
      // Backend not running, fallback safely
    }
    return { status: "offline", service: "offline-mock-fallback" };
  }

  static async fetchIntegrationStatus() {
    try {
      const res = await fetch(`${API_BASE_URL}/integration/status`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return {
      mode: "local_demo",
      shared_server: true,
      database_backed_legacy_routes: true,
      notice: "Offline fallback or mock mode"
    };
  }

  static async fetchTreatments() {
    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/demo/treatments`, {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.treatments?.length) return data.treatments;
        }
      } catch {
        // fallback
      }
    }

    return [
      { id: "angioplasty", name: "Angioplasty (PTCA with Stenting)", family: "Cardiology", min_cost: 120000, max_cost: 250000 },
      { id: "knee-replacement", name: "Total Knee Replacement (Single Joint)", family: "Orthopedics", min_cost: 140000, max_cost: 210000 },
      { id: "cataract-surgery", name: "Cataract Surgery (Phacoemulsification)", family: "Ophthalmology", min_cost: 20000, max_cost: 45000 },
      { id: "normal-delivery", name: "Normal Vaginal Delivery", family: "Obstetrics", min_cost: 35000, max_cost: 65000 },
      { id: "cesarean-section", name: "Cesarean Section (C-Section)", family: "Obstetrics", min_cost: 55000, max_cost: 95000 },
      { id: "mri-scan", name: "MRI Scan (Single Region)", family: "Radiology", min_cost: 6000, max_cost: 11000 },
      { id: "ct-scan", name: "CT Scan (Brain / Chest)", family: "Radiology", min_cost: 3500, max_cost: 8000 },
      { id: "appendectomy", name: "Laparoscopic Appendectomy", family: "General Surgery", min_cost: 60000, max_cost: 95000 },
      { id: "dialysis", name: "Hemodialysis (Per Session)", family: "Nephrology", min_cost: 1800, max_cost: 3500 },
      { id: "consultation", name: "Senior Specialist Consultation", family: "General Medicine", min_cost: 600, max_cost: 1500 },
    ];
  }

  static async sendChatMessage(message, sessionId = "demo-session") {
    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, session_id: sessionId }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        console.warn("Backend unavailable, falling back to local client response");
      }
    }

    const lower = message.toLowerCase();
    if (lower.includes("chest pain") || lower.includes("heart attack") || lower.includes("cannot breathe") || lower.includes("stroke")) {
      return {
        answer: "🚨 EMERGENCY ALERT: Please call 108 or 112 immediately or rush to the nearest casualty / emergency room. Do not wait for administrative approvals in acute medical emergencies.",
        emergency_detected: true,
        tool_calls: [],
        hospitals: [],
        cost_estimate: null,
        schemes: [],
        requires_confirmation: false,
        data_mode: "mock",
        disclaimer: "Informational assistance only. Emergency alert."
      };
    }

    if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) {
      return {
        answer: "I can help register a simulated appointment request for the educational demo. Please confirm your hospital choice, preferred date, and contact details.",
        emergency_detected: false,
        tool_calls: [{ tool: "book_simulated_appointment", arguments: { status: "pending_confirmation" } }],
        hospitals: MOCK_HOSPITALS.slice(0, 2),
        cost_estimate: null,
        schemes: [],
        requires_confirmation: true,
        confirmation_prompt: "Please confirm if you would like to proceed with registering this simulated appointment request.",
        data_mode: "mock",
        disclaimer: "Simulated booking engine for educational demonstration."
      };
    }

    return {
      answer: "Here is a complete overview based on verified regional healthcare benchmarks in Hyderabad. Showing matching accredited hospitals, indicative costs, and applicable government schemes.",
      emergency_detected: false,
      tool_calls: [
        { tool: "search_hospitals", arguments: { city: "Hyderabad" }, result_count: MOCK_HOSPITALS.length },
        { tool: "estimate_treatment_cost", arguments: { procedure: "Angioplasty" }, result_count: 1 },
        { tool: "find_healthcare_schemes", arguments: { state: "Telangana" }, result_count: 2 }
      ],
      hospitals: MOCK_HOSPITALS.slice(0, 3),
      cost_estimate: {
        procedure: "Angioplasty (PTCA with Stenting)",
        city: "Hyderabad",
        room_type: "Semi-Private",
        indicative_range_min: 120000,
        indicative_range_max: 250000,
        average_cost: 185000,
        room_multiplier: 1.0,
        factors: [
          "Number of drug-eluting stents (DES)",
          "Post-op CCU/ICU duration",
          "Lesion complexity and comorbidities"
        ],
        covered_under_schemes: ["Ayushman Bharat (PM-JAY)", "Aarogyasri"],
        disclaimer: "Indicative range based on tertiary healthcare packages in Hyderabad.",
        data_mode: "estimated"
      },
      schemes: MOCK_SCHEMES.slice(0, 2),
      requires_confirmation: false,
      data_mode: "mock",
      disclaimer: "Informational assistance only. This agent does not provide clinical diagnoses or prescriptions."
    };
  }

  static async fetchHospitals({ city, specialty, maxBudget, scheme, procedure } = {}) {
    if (!FORCE_MOCK) {
      try {
        const params = new URLSearchParams();
        if (city) params.append("city", city);
        if (specialty && specialty !== "All") params.append("specialty", specialty);
        if (maxBudget) params.append("max_budget", maxBudget);
        if (scheme && scheme !== "All") params.append("scheme", scheme);
        if (procedure) params.append("procedure", procedure);

        const url = `${API_BASE_URL}/api/hospitals${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) return await res.json();
      } catch {
        console.warn("Backend unavailable, using client mock hospitals");
      }
    }

    let list = [...MOCK_HOSPITALS];
    if (city) list = list.filter(h => h.city.toLowerCase().includes(city.toLowerCase()));
    if (specialty && specialty !== "All") {
      list = list.filter(h => h.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase())));
    }
    if (scheme && scheme !== "All") {
      list = list.filter(h => h.accepted_schemes.some(s => s.toLowerCase().includes(scheme.toLowerCase())));
    }
    return { total: list.length, hospitals: list, data_mode: "mock" };
  }

  static async estimateCost({ procedure, city = "Hyderabad", roomType = "Semi-Private", hospitalId = null, stayDays = 3 }) {
    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cost-estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            procedure,
            city,
            room_type: roomType,
            hospital_id: hospitalId
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          // compute detailed breakdown if needed
          return this.attachBreakdown(data, stayDays, roomType);
        }
      } catch {
        console.warn("Backend unavailable, using client estimated cost");
      }
    }

    // Comprehensive fallback for realistic procedures
    const procKey = (procedure || "Angioplasty").toLowerCase();
    let min = 120000;
    let max = 250000;
    let factors = ["Standard drug-eluting stent", "ICU monitoring", "Pre-op catheterization"];
    let schemes = ["Ayushman Bharat (PM-JAY)", "Aarogyasri"];

    if (procKey.includes("knee")) {
      min = 140000; max = 210000;
      factors = ["Titanium / Oxinium implant", "Post-op physiotherapy", "Robotic assistance"];
    } else if (procKey.includes("cataract")) {
      min = 20000; max = 45000;
      factors = ["Monofocal / Toric / Multifocal IOL", "Femtosecond laser assistance"];
    } else if (procKey.includes("normal delivery") || procKey.includes("delivery")) {
      min = 35000; max = 65000;
      factors = ["Epidural analgesia", "Nursery monitoring", "Maternal stay"];
      schemes = ["Janani Suraksha Yojana", "Aarogyasri", "Ayushman Bharat (PM-JAY)"];
    } else if (procKey.includes("cesarean") || procKey.includes("c-section")) {
      min = 55000; max = 95000;
      factors = ["Surgical theatre charges", "Anesthesia specialist", "Extended recovery"];
    } else if (procKey.includes("mri")) {
      min = 6000; max = 11000;
      factors = ["Contrast medium administration", "Single vs multiple joint views"];
      schemes = ["Aarogyasri", "CGHS"];
    }

    const roomMultipliers = {
      "General Ward": 0.85,
      "Semi-Private": 1.0,
      "Private Room": 1.25,
      "ICU": 1.6
    };
    const mult = roomMultipliers[roomType] || 1.0;
    const adjustedMin = Math.round(min * mult);
    const adjustedMax = Math.round(max * mult);

    const baseData = {
      procedure: procedure || "Angioplasty (PTCA with Stenting)",
      city,
      room_type: roomType,
      indicative_range_min: adjustedMin,
      indicative_range_max: adjustedMax,
      average_cost: Math.round((adjustedMin + adjustedMax) / 2),
      room_multiplier: mult,
      factors,
      covered_under_schemes: schemes,
      disclaimer: "Indicative estimate only based on regional tertiary hospital benchmarks. Actual costs depend on medical comorbidity management.",
      data_mode: "estimated"
    };

    return this.attachBreakdown(baseData, stayDays, roomType);
  }

  static attachBreakdown(data, stayDays = 3, roomType = "Semi-Private") {
    const min = data.indicative_range_min || 120000;
    const max = data.indicative_range_max || 250000;

    // Build realistic component breakdown percentages
    // Procedure/OT: ~55%
    // Room: ~12%
    // Doctor/Consultation: ~6%
    // Diagnostics/Labs: ~9%
    // Medicines/Consumables: ~18%
    const procedureMin = Math.round(min * 0.55);
    const procedureMax = Math.round(max * 0.55);

    const roomRatePerDay = roomType === "ICU" ? 7500 : roomType === "Private Room" ? 4500 : roomType === "Semi-Private" ? 2800 : 1200;
    const roomMin = roomRatePerDay * stayDays;
    const roomMax = Math.round(roomMin * 1.35);

    const doctorMin = Math.round(min * 0.06);
    const doctorMax = Math.round(max * 0.06);

    const diagMin = Math.round(min * 0.08);
    const diagMax = Math.round(max * 0.09);

    const medMin = Math.max(5000, min - (procedureMin + roomMin + doctorMin + diagMin));
    const medMax = Math.max(10000, max - (procedureMax + roomMax + doctorMax + diagMax));

    return {
      ...data,
      stay_days: stayDays,
      breakdown: {
        procedure: { min: procedureMin, max: procedureMax, label: "Procedure & OT / Cath Lab Charges" },
        room: { min: roomMin, max: roomMax, label: `Room & Nursing (${stayDays} days, ${roomType})` },
        doctor: { min: doctorMin, max: doctorMax, label: "Doctor & Specialist Consultation" },
        diagnostics: { min: diagMin, max: diagMax, label: "Pre-op Labs & Diagnostic Tests (ECG, Echo, Blood)" },
        medicines: { min: medMin, max: medMax, label: "Medicines & Surgical Consumables" }
      }
    };
  }

  static async fetchSchemes({ incomeBracket, state, category } = {}) {
    if (!FORCE_MOCK) {
      try {
        const params = new URLSearchParams();
        if (incomeBracket) params.append("income_bracket", incomeBracket);
        if (state) params.append("state", state);
        if (category && category !== "All") params.append("category", category);

        const url = `${API_BASE_URL}/api/schemes${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) return await res.json();
      } catch {
        console.warn("Backend unavailable, using client mock schemes");
      }
    }

    let list = [...MOCK_SCHEMES];
    if (category && category !== "All") {
      list = list.filter(s => s.category.toLowerCase() === category.toLowerCase());
    }
    return { total: list.length, schemes: list, data_mode: "mock" };
  }

  static async checkSchemeEligibility(schemeId, profile = {}) {
    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/demo/schemes/${schemeId}/match`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }

    // Client-side rule evaluation matching official criteria
    const age = parseInt(profile.age || 0, 10);
    const hasRationCard = profile.has_ration_card === true || profile.has_ration_card === "true";
    const income = parseFloat(profile.annual_income || 0);

    if (schemeId === "scheme-pmjay") {
      if (age >= 70) {
        return {
          status: "eligible",
          scheme_id: "scheme-pmjay",
          coverage_limit: 500000,
          reason: "Senior citizen pathway (Aged 70+): Universal eligibility irrespective of family income under Ayushman Bharat expansion.",
          next_steps: ["Generate Ayushman Vay Vandana Card via PM-JAY portal using Aadhaar e-KYC."]
        };
      }
      if (hasRationCard || (income > 0 && income <= 250000)) {
        return {
          status: "eligible",
          scheme_id: "scheme-pmjay",
          coverage_limit: 500000,
          reason: "SECC/Deprivation eligible category: Family income falls within priority social support threshold.",
          next_steps: ["Check beneficiary list with Aadhaar number at your nearest Ayushman Kendra / CSC."]
        };
      }
      return {
        status: "needs_verification",
        scheme_id: "scheme-pmjay",
        coverage_limit: 500000,
        reason: "General applicant: Eligibility requires verification against SECC 2011 database or ABHA registration.",
        next_steps: ["Verify via mera.pmjay.gov.in using your mobile number and ration card details."]
      };
    }

    if (schemeId === "scheme-aarogyasri") {
      if (hasRationCard || (income > 0 && income <= 500000)) {
        return {
          status: "eligible",
          scheme_id: "scheme-aarogyasri",
          coverage_limit: 1000000,
          reason: "White Ration Card / Food Security Card criteria met: Eligible for cashless tertiary care up to ₹10 Lakh in Telangana network hospitals.",
          next_steps: ["Present Food Security Card and Aadhaar at the Aarogya Mithra desk upon hospital admission."]
        };
      }
      return {
        status: "ineligible_or_needs_review",
        scheme_id: "scheme-aarogyasri",
        coverage_limit: 1000000,
        reason: "Income above ₹5,00,000 threshold without white ration card.",
        next_steps: ["Explore central or private insurance alternatives."]
      };
    }

    return {
      status: "informational",
      scheme_id: schemeId,
      coverage_limit: 500000,
      reason: "Institutional enrollment required through your employer or pension authority.",
      next_steps: ["Contact dispensary office or nodal agency."]
    };
  }

  static async confirmAppointment(payload) {
    if (!payload.user_confirmed) {
      throw new Error("Explicit user confirmation is required.");
    }

    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/appointments/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) return await res.json();
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to confirm appointment");
      } catch (e) {
        if (e.message && e.message !== "Failed to fetch") throw e;
        console.warn("Backend unavailable, simulating appointment confirmation client-side");
      }
    }

    return {
      confirmation_id: `SIM-APT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "simulated_confirmed",
      hospital_name: payload.hospital_name || "Hospital",
      patient_name: payload.patient_name,
      specialty: payload.specialty,
      preferred_date: payload.preferred_date,
      is_simulated: true,
      instructions: "ACADEMIC DEMO NOTICE: This is a simulation. No clinical booking has been made.",
      message: "Simulated appointment request registered successfully."
    };
  }
}
