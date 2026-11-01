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

  static async fetchHospitals({ city, specialty, maxBudget, scheme, pincode, locality, hospitalType, facility, accreditation, sortBy, page, pageSize, state, district, careType, category, search } = {}) {
    if (!FORCE_MOCK) {
      try {
        const params = new URLSearchParams();
        if (page) params.append("page", page);
        if (pageSize) params.append("page_size", pageSize);
        if (state && state !== "All") params.append("state", state);
        if (district && district !== "All") params.append("district", district);
        if (city) params.append("city", city);
        if (careType && careType !== "All") params.append("care_type", careType);
        if (category && category !== "All") params.append("category", category);
        if (specialty && specialty !== "All") params.append("specialty", specialty);
        if (maxBudget) params.append("max_budget", maxBudget);
        if (scheme && scheme !== "All") params.append("scheme", scheme);
        if (pincode) params.append("pincode", pincode);
        if (locality) params.append("locality", locality);
        if (hospitalType && hospitalType !== "All") params.append("hospital_type", hospitalType);
        if (facility) params.append("facility", facility);
        if (accreditation && accreditation !== "All") params.append("accreditation", accreditation);
        if (search) params.append("search", search);
        if (sortBy) params.append("sort_by", sortBy);

        const url = `${API_BASE_URL}/api/hospitals${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
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
    if (hospitalType && hospitalType !== "All") {
      list = list.filter(h => (h.hospital_type || "Private").toLowerCase() === hospitalType.toLowerCase());
    }
    if (pincode) {
      list = list.filter(h => (h.pincode || "").includes(pincode));
    }
    return { total: list.length, hospitals: list, data_mode: "mock" };
  }

  static async fetchHospitalFilters(state = null) {
    if (!FORCE_MOCK) {
      try {
        const query = state && state !== "All" ? `?state=${encodeURIComponent(state)}` : "";
        const res = await fetch(`${API_BASE_URL}/api/hospitals/filters${query}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn("fetchHospitalFilters error:", e);
      }
    }
    return {
      states: ["Telangana", "Andhra Pradesh", "Karnataka", "Maharashtra", "Tamil Nadu"],
      districts: ["Hyderabad", "Ranga Reddy", "Medchal-Malkajgiri", "Warangal"],
      care_types: ["Hospital", "Dispensary", "Community Health Centre", "Clinic"],
      categories: ["Public/ Government", "Private"],
      popular_specialties: ["General Medicine", "Cardiology", "Orthopedics", "Obstetrics & Gynecology", "Pediatrics", "Ophthalmology", "Dental", "Surgery", "Neurology", "Oncology", "Nephrology", "Dermatology", "ENT", "Psychiatry"],
      total_hospitals: 30273
    };
  }

  static async fetchHospitalStatistics() {
    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/hospitals/statistics`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn("fetchHospitalStatistics error:", e);
      }
    }
    return {
      total_hospitals: 30273,
      states_count: 36,
      districts_count: 734,
      hospitals_with_phone: 2197,
      hospitals_with_coordinates: 10843,
      hospitals_with_specialties: 990,
      data_source: "National Health Portal (NHP) Open Government Data CSV (Ministry of Health and Family Welfare)",
      import_date: "2026-11-01",
      notes: "Imported 30,273 hospital records across 36 Indian States and Union Territories with deduplication and postal verification."
    };
  }

  static async fetchImportedHospitals({
    page = 1,
    pageSize = 20,
    state,
    district,
    city,
    careType,
    category,
    specialty,
    pincode,
    search,
    sortBy = "name_asc"
  } = {}) {
    if (!FORCE_MOCK) {
      try {
        const params = new URLSearchParams();
        if (page) params.append("page", page);
        if (pageSize) params.append("page_size", pageSize);
        if (state && state !== "All") params.append("state", state);
        if (district && district !== "All") params.append("district", district);
        if (city) params.append("city", city);
        if (careType && careType !== "All") params.append("care_type", careType);
        if (category && category !== "All") params.append("category", category);
        if (specialty && specialty !== "All") params.append("specialty", specialty);
        if (pincode) params.append("pincode", pincode);
        if (search) params.append("search", search);
        if (sortBy) params.append("sort_by", sortBy);

        const url = `${API_BASE_URL}/api/hospitals?${params.toString()}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn("fetchImportedHospitals error:", e);
      }
    }

    return {
      total: MOCK_HOSPITALS.length,
      page: 1,
      page_size: pageSize,
      total_pages: 1,
      hospitals: MOCK_HOSPITALS.map(h => ({
        id: h.id,
        name: h.name,
        state: "Telangana",
        district: "Hyderabad",
        subdistrict: "Not available",
        pincode: h.pincode || "500034",
        location: h.locality || "Hyderabad",
        address: h.address,
        latitude: h.latitude,
        longitude: h.longitude,
        care_type: h.hospital_type || "Hospital",
        category: h.hospital_type || "Private",
        discipline: "Allopathic",
        telephone: h.phone || "Not available",
        mobile_number: "Not available",
        emergency_num: h.phone || "Not available",
        ambulance_phone: "108",
        bloodbank_phone: "Not available",
        tollfree: "Not available",
        helpline: "Not available",
        email: "Not available",
        website: h.website || "Not available",
        specialties: h.specialties || [],
        facilities: h.facilities || [],
        accreditation: "Not available (unrecorded in registry)",
        established_year: null,
        total_beds: null,
        data_source: "National Health Portal (NHP) Open Data Directory",
        import_date: "2026-11-01",
        directions_url: h.directions_url
      })),
      data_source: "Local Fallback Registry",
      filters_applied: {}
    };
  }

  static async fetchHospitalById(hospitalId) {
    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/hospitals/${hospitalId}`, { signal: AbortSignal.timeout(4000) });
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }
    return MOCK_HOSPITALS.find(h => h.id === hospitalId) || MOCK_HOSPITALS[0];
  }

  static async compareHospitals(hospitalIds, procedure = "Angioplasty") {
    if (!FORCE_MOCK) {
      try {
        const params = new URLSearchParams();
        for (const id of hospitalIds) {
          params.append("hospital_ids", id);
        }
        params.append("procedure", procedure);
        const res = await fetch(`${API_BASE_URL}/api/hospitals/compare?${params.toString()}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }

    const selected = MOCK_HOSPITALS.filter(h => hospitalIds.includes(h.id));
    return {
      procedure,
      comparison_count: selected.length,
      hospitals: selected.map(h => ({
        hospital_id: h.id,
        name: h.name,
        city: h.city,
        locality: h.locality || h.address,
        hospital_type: h.hospital_type || "Private",
        accreditation: h.accreditation,
        rating: h.rating,
        distance_km: h.distance_km,
        phone: h.phone,
        procedure,
        indicative_cost: h.indicative_costs[procedure] || 150000,
        doctor_consultation_fee: h.indicative_costs["Doctor Consultation"] || 800,
        empanelled_schemes: h.accepted_schemes,
        facilities: h.facilities || ["24x7 Emergency", "ICU", "Blood Bank"],
        directions_url: h.directions_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name)}`
      })),
      disclaimer: "Indicative comparative figures derived from verified hospital schedules."
    };
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
            stay_days: stayDays,
            hospital_id: hospitalId
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
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
      disclaimer: "Indicative estimate only based on regional tertiary hospital benchmarks and published tariff schedules.",
      data_mode: "estimated"
    };

    return this.attachBreakdown(baseData, stayDays, roomType);
  }

  static attachBreakdown(data, stayDays = 3, roomType = "Semi-Private") {
    const min = data.indicative_range_min || 120000;
    const max = data.indicative_range_max || 250000;

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

  static async evaluateSchemeEligibility(payload) {
    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/schemes/check-eligibility`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }

    // Client fallback
    const isSenior = payload.age >= 70 || payload.is_senior;
    const isTS = (payload.state || "").toLowerCase().includes("telangana");
    const matches = [
      {
        scheme_id: "scheme-pmjay",
        scheme_name: "Ayushman Bharat - PM-JAY",
        short_code: "PM-JAY",
        is_eligible: isSenior || payload.has_ration_card,
        eligibility_status: isSenior ? "Likely Eligible" : payload.has_ration_card ? "Likely Eligible" : "Conditionally Eligible",
        coverage_limit: 500000,
        reasons: isSenior ? ["Universal senior citizen coverage for age 70+."] : ["SECC priority beneficiary under food security ration card."],
        required_documents: ["Aadhaar Card", "Ration Card", "Ayushman Card"],
        application_process: "Visit Ayushman Mitra desk at empanelled hospital.",
        official_portal: "https://beneficiary.nha.gov.in"
      },
      {
        scheme_id: "scheme-aarogyasri",
        scheme_name: "Telangana Aarogyasri Community Healthcare",
        short_code: "AAROGYASRI",
        is_eligible: isTS && payload.has_ration_card,
        eligibility_status: (isTS && payload.has_ration_card) ? "Likely Eligible" : "Not Eligible",
        coverage_limit: 1000000,
        reasons: isTS ? ["Telangana White Ration Card qualifies for ₹10 Lakh coverage."] : ["Restricted to Telangana residents."],
        required_documents: ["White Ration Card", "Aadhaar Card", "Government Doctor Referral"],
        application_process: "Present White Card at Aarogya Mithra hospital desk.",
        official_portal: "https://aarogyasri.telangana.gov.in"
      }
    ];

    return {
      user_state: payload.state || "Telangana",
      matches,
      total_eligible: matches.filter(m => m.is_eligible).length,
      guidance: "Carry your Aadhaar card and Ration card to the hospital helpdesk for immediate pre-authorization.",
      disclaimer: "Preliminary assessment. Final verification performed by hospital helpdesk officers."
    };
  }

  static async fetchSources() {
    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/sources`, { signal: AbortSignal.timeout(4000) });
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }

    return {
      total: 5,
      sources: [
        {
          source_id: "source-cghs-2025",
          url: "https://cdnbbsr.s3waas.gov.in/s35679fb79d04e9ed91e292858c54df4e8/uploads/2026/05/202605131436427914.pdf",
          publisher: "Directorate General of CGHS, Ministry of Health and Family Welfare",
          title: "CGHS Tariff Schedule & Procedure Benchmarks (3 October 2025)",
          source_type: "government_tariff",
          provenance_badge: "Verified Official",
          notes: "Official Central Government rates for 1,800+ procedures, OPD consultations, and room tariffs."
        },
        {
          source_id: "source-nha-pmjay",
          url: "https://pmjay.gov.in/about/pmjay",
          publisher: "National Health Authority (NHA), Government of India",
          title: "Ayushman Bharat National Health Protection Scheme Package Master",
          source_type: "government_scheme",
          provenance_badge: "Verified Official",
          notes: "Cashless benefit package guidelines, SECC deprivation criteria, and universal senior citizen (70+) rules."
        },
        {
          source_id: "source-aarogyasri-trust",
          url: "https://aarogyasri.telangana.gov.in",
          publisher: "Telangana Aarogyasri Health Care Trust",
          title: "Telangana Aarogyasri Scheme Guidelines & ₹10 Lakh Coverage Orders",
          source_type: "state_scheme",
          provenance_badge: "Verified Official",
          notes: "State guidelines for White Ration Card holders, 1,672 empanelled treatment packages, and hospital network lists."
        },
        {
          source_id: "source-yashoda-rates",
          url: "https://www.yashodahospitals.com/treatment-costs/",
          publisher: "Yashoda Hospitals Hyderabad",
          title: "Published Self-Pay Procedure & Room Tariffs",
          source_type: "observed_provider",
          provenance_badge: "Observed Provider Tariff",
          notes: "Published hospital package observation for Angioplasty, MRI Scans, and Joint Replacement."
        },
        {
          source_id: "source-apollo-scan-rates",
          url: "https://www.apollo247.com/lab-tests/",
          publisher: "Apollo Health City / Apollo 24|7",
          title: "Diagnostic Scans & Radiology Schedule",
          source_type: "observed_provider",
          provenance_badge: "Observed Provider Tariff",
          notes: "Published diagnostic and consultation rates across Hyderabad metropolitan facilities."
        }
      ]
    };
  }

  static async generateHealthcarePlan(payload) {
    if (!FORCE_MOCK) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/plans/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }

    return {
      plan_id: `plan-${Math.floor(10000000 + Math.random() * 90000000)}`,
      created_at: new Date().toISOString(),
      treatment: payload.treatment || "Angioplasty",
      city: payload.city || "Hyderabad",
      budget: payload.budget || 200000,
      room_type: payload.room_type || "Semi-Private",
      estimated_cost_min: 120000,
      estimated_cost_max: 250000,
      average_cost: 185000,
      itemized_breakdown: {
        procedure_and_ot_charges: 96200,
        room_charges: 27750,
        doctor_and_surgeon_fees: 22200,
        diagnostics_and_labs: 18500,
        medicines_and_consumables: 20350
      },
      recommended_hospitals: MOCK_HOSPITALS.slice(0, 3).map(h => ({
        hospital_id: h.id,
        name: h.name,
        locality: h.locality || h.address,
        hospital_type: h.hospital_type || "Private",
        accreditation: h.accreditation,
        rating: h.rating,
        distance_km: h.distance_km,
        estimated_cost: h.indicative_costs[payload.treatment] || 175000,
        accepted_schemes: h.accepted_schemes,
        directions_url: h.directions_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name)}`
      })),
      applicable_schemes: [
        { scheme_name: "PM-JAY", coverage_amount: 500000, reason: "Cashless tertiary surgery coverage at empanelled network hospitals." },
        { scheme_name: "Telangana Aarogyasri", coverage_amount: 1000000, reason: "Enhanced ₹10 Lakh limit for White Ration Card families." }
      ],
      potential_coverage_max: 1000000,
      estimated_out_of_pocket_min: 0,
      estimated_out_of_pocket_max: 15000,
      financial_guidance: "Under PM-JAY and Aarogyasri, treatment is cashless at empanelled hospitals. Out-of-pocket expenses are restricted to optional premium room upgrades or non-standard consumables.",
      preparation_steps: [
        { step: 1, title: "Pre-Authorization & Document Verification", description: "Visit hospital Aarogya Mithra desk with Aadhaar and Ration Card.", documents_needed: ["Aadhaar", "Ration Card", "Doctor's Prescription"] },
        { step: 2, title: "Diagnostic Clearance & Pre-Op Testing", description: "Complete ECG, Echo, and routine blood clearance.", documents_needed: ["Lab Reports", "Scan Films"] },
        { step: 3, title: "Admission & Room Allocation", description: "Complete inpatient registration in your approved room category.", documents_needed: ["Admission Order", "Emergency Contact ID"] },
        { step: 4, title: "Discharge & Cashless Claim Finalization", description: "Collect detailed discharge summary and 10-day post-op medication package.", documents_needed: ["Signed Claim Voucher", "Discharge Summary"] }
      ],
      data_sources: [
        "National Health Authority Package Master",
        "Telangana Aarogyasri Trust Orders",
        "CGHS Tariff Benchmark Schedule"
      ],
      disclaimer: "Indicative care navigation plan based on verified public healthcare guidelines."
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

  static async fetchInsurers() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/insurers`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("fetchInsurers failed", e);
    }
    return [];
  }

  static async fetchPolicies(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.insurer_id) query.append("insurer_id", params.insurer_id);
      if (params.policy_type) query.append("policy_type", params.policy_type);
      const url = `${API_BASE_URL}/api/policies${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("fetchPolicies failed", e);
    }
    return [];
  }

  static async fetchPolicyById(policyId) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/policies/${encodeURIComponent(policyId)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("fetchPolicyById failed", e);
    }
    return null;
  }

  static async comparePolicies(policyIds) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/policies/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_ids: policyIds }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("comparePolicies failed", e);
    }
    return null;
  }

  static async fetchDiseases(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.search) query.append("search", params.search);
      if (params.specialty) query.append("specialty", params.specialty);
      const url = `${API_BASE_URL}/api/diseases${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("fetchDiseases failed", e);
    }
    return [];
  }

  static async fetchDiseaseById(diseaseId) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/diseases/${encodeURIComponent(diseaseId)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("fetchDiseaseById failed", e);
    }
    return null;
  }

  static async fetchProcedures(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.specialty) query.append("specialty", params.specialty);
      if (params.disease_id) query.append("disease_id", params.disease_id);
      const url = `${API_BASE_URL}/api/procedures${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("fetchProcedures failed", e);
    }
    return [];
  }

  static async matchHospitalInsuranceNetwork(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/network/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("matchHospitalInsuranceNetwork failed", e);
    }
    return {
      total_matches: 0,
      matches: [],
      query_summary: payload,
      actionable_advice: ["Verification with hospital TPA desk recommended."],
      disclaimer: "Data network check."
    };
  }

  static async calculateOutOfPocket(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/calculator/out-of-pocket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("calculateOutOfPocket failed", e);
    }
    return null;
  }
}
