# API Contract: Healthcare Cost and Care Navigation Agent

**Version**: 1.0.0  
**Base URL**: `/api` (Configured on frontend via `VITE_API_BASE_URL`, default `http://localhost:8000`)

---

## 1. Overview & General Standards

- All requests with payloads must have `Content-Type: application/json`.
- All responses return JSON with standardized status codes.
- Every response from data-bearing endpoints includes a `"data_mode"` indicator:
  - `"mock"`: Demonstrative local mock records (fully functional offline/demo).
  - `"estimated"`: Algorithmic or statistical estimate.
  - `"verified"`: Authenticated / confirmed real data.
- **Safety First**:
  - The API does NOT diagnose illnesses or prescribe medication.
  - Emergency inputs trigger high-priority alert recommendations (108 / 112 / Emergency ER) instead of chatbot delays.
  - Consequential actions (e.g. appointment booking) require explicit confirmation and indicate simulation status (`is_simulated: true`).

---

## 2. Shared Data Models

### 2.1 Hospital
```typescript
interface Hospital {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  specialties: string[];
  indicative_costs: Record<string, number>; // e.g. { "Cardiology Consultation": 800, "Angioplasty": 140000 }
  rating: number; // 1.0 to 5.0
  distance_km: number;
  accepted_schemes: string[]; // e.g. ["Ayushman Bharat (PM-JAY)", "Aarogyasri", "CGHS"]
  accreditation: string[]; // e.g. ["NABH", "JCI", "NABL"]
  verified: boolean;
  data_mode: "mock" | "verified";
}
```

### 2.2 Healthcare Scheme
```typescript
interface HealthcareScheme {
  id: string;
  name: string;
  short_code: string; // e.g. "PM-JAY", "AAROGYASRI", "CGHS", "ESIC"
  category: "Government" | "State" | "Social Security" | "Private Subsidized";
  coverage_limit: number; // INR annual coverage (e.g. 500000 for PM-JAY)
  eligibility_summary: string;
  covered_specialties: string[];
  income_ceiling_inr?: number | null;
  official_portal: string;
  claim_process_summary: string;
  data_mode: "mock" | "verified";
}
```

### 2.3 Cost Estimate
```typescript
interface CostEstimate {
  procedure: string;
  city: string;
  room_type: "General Ward" | "Semi-Private" | "Private Room" | "ICU";
  indicative_range_min: number;
  indicative_range_max: number;
  average_cost: number;
  room_multiplier: number;
  factors: string[];
  covered_under_schemes: string[];
  disclaimer: string;
  data_mode: "mock" | "estimated";
}
```

---

## 3. Endpoints

### 3.1 `POST /api/chat`
Process natural language queries using the AI Agent orchestrator.

- **Request Body**:
  ```json
  {
    "message": "Find affordable cardiology hospitals in Hyderabad with Ayushman Bharat",
    "session_id": "demo-session-123"
  }
  ```

- **Response Body (`200 OK`)**:
  ```json
  {
    "answer": "Here are 3 affordable hospitals in Hyderabad with cardiology departments accepting Ayushman Bharat...",
    "tool_calls": [
      {
        "tool": "search_hospitals",
        "arguments": { "city": "Hyderabad", "specialty": "Cardiology", "scheme": "Ayushman Bharat" },
        "result_count": 3
      }
    ],
    "hospitals": [ /* Array of Hospital */ ],
    "cost_estimate": null,
    "schemes": [ /* Array of HealthcareScheme */ ],
    "requires_confirmation": false,
    "confirmation_prompt": null,
    "emergency_detected": false,
    "data_mode": "mock"
  }
  ```

---

### 3.2 `GET /api/hospitals`
Filter and search hospital directory.

- **Query Parameters**:
  - `city` (string, optional): e.g. `"Hyderabad"`, `"Bengaluru"`, `"Delhi"`
  - `specialty` (string, optional): e.g. `"Cardiology"`, `"Orthopedics"`, `"Oncology"`
  - `max_budget` (number, optional): Maximum indicative procedure cost threshold
  - `scheme` (string, optional): Filter by accepted scheme (e.g. `"PM-JAY"`, `"Aarogyasri"`)

- **Response Body (`200 OK`)**:
  ```json
  {
    "total": 3,
    "hospitals": [ /* Array of Hospital */ ],
    "data_mode": "mock"
  }
  ```

---

### 3.3 `POST /api/cost-estimate`
Calculate indicative cost ranges based on procedure, location, and room tier.

- **Request Body**:
  ```json
  {
    "procedure": "Angioplasty",
    "city": "Hyderabad",
    "room_type": "Semi-Private"
  }
  ```

- **Response Body (`200 OK`)**:
  ```json
  {
    "procedure": "Angioplasty",
    "city": "Hyderabad",
    "room_type": "Semi-Private",
    "indicative_range_min": 120000,
    "indicative_range_max": 180000,
    "average_cost": 150000,
    "room_multiplier": 1.25,
    "factors": [
      "Stent type (Drug Eluting vs Bare Metal)",
      "Number of stents required",
      "ICU stay duration",
      "Surgeon expertise tier"
    ],
    "covered_under_schemes": ["Ayushman Bharat (PM-JAY)", "Aarogyasri"],
    "disclaimer": "Indicative estimate only. Actual hospital charges depend on comorbidities, diagnostic tests, and clinical complications.",
    "data_mode": "estimated"
  }
  ```

---

### 3.4 `GET /api/schemes`
Retrieve available government and public healthcare schemes.

- **Query Parameters**:
  - `income_bracket` (string, optional): e.g. `"low"`, `"bpl"`, `"middle"`
  - `state` (string, optional): e.g. `"Telangana"`, `"All India"`
  - `category` (string, optional): Filter by category

- **Response Body (`200 OK`)**:
  ```json
  {
    "total": 4,
    "schemes": [ /* Array of HealthcareScheme */ ],
    "data_mode": "mock"
  }
  ```

---

### 3.5 `POST /api/appointments/confirm`
Explicit simulated appointment booking request.

- **Request Body**:
  ```json
  {
    "hospital_id": "hosp-hyd-01",
    "patient_name": "Ramesh Kumar",
    "patient_phone": "+91 98765 43210",
    "specialty": "Cardiology",
    "preferred_date": "2026-11-05",
    "user_confirmed": true
  }
  ```

- **Response Body (`200 OK`)**:
  ```json
  {
    "confirmation_id": "SIM-APT-2026-9814",
    "status": "simulated_confirmed",
    "hospital_name": "Apollo Hospitals, Jubilee Hills",
    "patient_name": "Ramesh Kumar",
    "specialty": "Cardiology",
    "preferred_date": "2026-11-05",
    "is_simulated": true,
    "instructions": "This is a college project simulation. No actual booking has been made at the hospital. Bring photo ID and existing medical records to the outpatient desk.",
    "message": "Simulated appointment request registered successfully."
  }
  ```

- **Error Response (`400 Bad Request` if user_confirmed is false)**:
  ```json
  {
    "detail": "Appointment confirmation requires explicit user consent (user_confirmed: true)."
  }
  ```

---

### 3.6 `GET /api/health`
Health check for frontend to verify backend availability.

- **Response Body (`200 OK`)**:
  ```json
  {
    "status": "healthy",
    "service": "healthcare-agent-backend",
    "version": "1.0.0",
    "llm_provider": "gemini-or-mock",
    "mock_mode": true
  }
  ```
