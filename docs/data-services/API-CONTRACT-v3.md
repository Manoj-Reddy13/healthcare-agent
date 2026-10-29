# Member 3 independent API contract

Base URL: `http://127.0.0.1:8001/api/v2/data`. This version is additive and deliberately uses a distinct prefix from the original app. Its schemas are not a drop-in replacement for the existing frontend or agent contracts. Live interactive documentation is at `/docs`; machine-readable schema is at `/openapi.json`.

## Endpoints

| Method / route | Input | Output |
|---|---|---|
| GET /health | None | Database availability, hospital count, price pipeline availability, configured policy count |
| GET /hospitals | Optional city, specialty, limit (1–100), offset; optional price-budget context below | total, hospitals, status; specialty matches include claim-level evidence |
| GET /treatments | None | Sourced exact treatment variants and separately labelled draft families |
| POST /cost-estimate | treatment_id, city, room_type, billing_unit, comparison_group; optional hospital_id and on_date | estimated range with evidence, or unavailable |
| GET /schemes | None | Configured policy identifiers and review status; zero real policies currently configured |
| POST /schemes/{scheme_id}/match | answers object, optional on_date | potentially_applicable, not_applicable or needs_information, with rule trace |

Price-budget hospital search additionally requires max_budget_inr as an exact decimal string, treatment_id, city, room_type, billing_unit and comparison_group. The whole observed range must fit. Scheme participation filters and combined specialty/price filters return 422 until supported. An ignored filter must never look successful.

City matching is case-insensitive, with Bangalore normalized to Bengaluru. Specialty labels are case-insensitive; Cardiac Sciences normalizes to Cardiology and Orthopaedics to Orthopedics. Only sourced relationships inside their collection/review interval are returned. Unknown cities and specialties return empty lists.

Allowed room types: General Ward, Semi-Private, Private Room, ICU, Not Applicable. The last value supports outpatient procedures where a room category does not apply. Billing units: per_procedure, per_consultation, per_scan, per_day. No currency conversion is performed; money outputs are decimal INR strings.

Example cost request:

```json
{
  "treatment_id": "treatment-mri-knee-single-plain",
  "city": "Hyderabad",
  "room_type": "Not Applicable",
  "billing_unit": "per_scan",
  "comparison_group": "single-knee-plain-no-sedation",
  "on_date": "2026-10-29"
}
```

The delivered directory snapshot has no approved cash prices. This request therefore returns status=unavailable and observation_count=0, not a CGHS tariff or a fabricated estimate. Price endpoints become useful after an actual reviewed batch is imported into a new snapshot and MEMBER3_DATABASE points to it.

## Errors and dates

- 200: request processed; inspect status to distinguish results from unavailable data.
- 404: requested scheme policy is not configured, or route does not exist.
- 422: invalid payload, unsupported filter combination, missing budget context or invalid money/date.
- 503: database unavailable/incompatible, or configured policy requires review. Internal database paths are not returned in these errors.

Dates use ISO YYYY-MM-DD. Default evaluation date is the current date in India. Validity starts are inclusive, ends exclusive; refresh deadlines are inclusive. User-supplied dates allow repeatable historical checks, not forecasts of future hospital availability. POST cost/match bodies reject unknown top-level fields.

## Integration handoff

The existing app remains on port 8000. A later owner-approved connection step must map sourced provenance, optional rating/distance/phone, unavailable responses, treatment identity and conditional coverage to compatible application models. Do not label sourced records as verified simply to satisfy an existing enum. Do not replace rating or distance with invented numbers. Agent/UI wiring is outside this deliverable.

The standalone app has no write or booking endpoints, authentication, or public deployment configuration. Run locally on 127.0.0.1. It accepts the two existing local Vite origins. This is a local demo and integration contract, not a public production deployment.
