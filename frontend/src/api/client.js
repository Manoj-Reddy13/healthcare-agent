import { MOCK_HOSPITALS, MOCK_SCHEMES } from "./mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export class ApiClient {
  static async checkHealth() {
    if (FORCE_MOCK) return { status: "mock", service: "frontend-mock-mode" };
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return await res.json();
    } catch {
      // Backend not running, fallback safely
    }
    return { status: "offline", service: "offline-mock-fallback" };
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

    // Client-side fallback for development if backend server is not running
    const lower = message.toLowerCase();
    if (lower.includes("chest pain") || lower.includes("heart attack") || lower.includes("cannot breathe")) {
      return {
        answer: "🚨 EMERGENCY ALERT: Please call 108 or 112 immediately or rush to the nearest casualty / emergency room.",
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

    return {
      answer: "I found matching hospitals in Hyderabad. Showing indicative cost benchmarks and accepted health schemes below.",
      tool_calls: [{ tool: "search_hospitals", arguments: { city: "Hyderabad" }, result_count: MOCK_HOSPITALS.length }],
      hospitals: MOCK_HOSPITALS,
      cost_estimate: null,
      schemes: MOCK_SCHEMES,
      requires_confirmation: false,
      data_mode: "mock",
      disclaimer: "Informational assistance only. This agent does not provide medical diagnoses or prescriptions."
    };
  }

  static async fetchHospitals({ city, specialty, maxBudget, scheme } = {}) {
    if (!FORCE_MOCK) {
      try {
        const params = new URLSearchParams();
        if (city) params.append("city", city);
        if (specialty) params.append("specialty", specialty);
        if (maxBudget) params.append("max_budget", maxBudget);
        if (scheme) params.append("scheme", scheme);

        const url = `${API_BASE_URL}/api/hospitals${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) return await res.json();
      } catch {
        console.warn("Backend unavailable, using client mock hospitals");
      }
    }

    let list = [...MOCK_HOSPITALS];
    if (city) list = list.filter(h => h.city.toLowerCase().includes(city.toLowerCase()));
    if (specialty) list = list.filter(h => h.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase())));
    if (scheme) list = list.filter(h => h.accepted_schemes.some(s => s.toLowerCase().includes(scheme.toLowerCase())));
    return { total: list.length, hospitals: list, data_mode: "mock" };
  }

  static async estimateCost({ procedure, city = "Hyderabad", roomType = "Semi-Private" }) {
    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cost-estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ procedure, city, room_type: roomType }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) return await res.json();
      } catch {
        console.warn("Backend unavailable, using client estimated cost");
      }
    }

    return {
      procedure: procedure || "Angioplasty (PTCA with Stenting)",
      city,
      room_type: roomType,
      indicative_range_min: 120000,
      indicative_range_max: 180000,
      average_cost: 150000,
      room_multiplier: 1.0,
      factors: [
        "Stent type and quantity",
        "Duration of ICU stay",
        "Clinical comorbidities"
      ],
      covered_under_schemes: ["Ayushman Bharat (PM-JAY)", "Aarogyasri"],
      disclaimer: "Indicative estimate only. Actual hospital charges depend on comorbidity management.",
      data_mode: "estimated"
    };
  }

  static async fetchSchemes({ incomeBracket, state, category } = {}) {
    if (!FORCE_MOCK) {
      try {
        const params = new URLSearchParams();
        if (incomeBracket) params.append("income_bracket", incomeBracket);
        if (state) params.append("state", state);
        if (category) params.append("category", category);

        const url = `${API_BASE_URL}/api/schemes${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) return await res.json();
      } catch {
        console.warn("Backend unavailable, using client mock schemes");
      }
    }

    return { total: MOCK_SCHEMES.length, schemes: MOCK_SCHEMES, data_mode: "mock" };
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
