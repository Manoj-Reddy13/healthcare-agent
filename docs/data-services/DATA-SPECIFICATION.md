# Healthcare data specification

Version: 1.0 — 29 October 2026
Owner: Member 3 — Data, APIs and Cost Engine
Review support: Member 4 — Integration and Testing
Baseline inspected: repository commit `2cca928`.

## Purpose and scope

Define the data we will collect before building the database and services. This is a proposed internal data contract, informed by the existing Pydantic models and API contract. It introduces no application changes. Frontend and AI-agent implementation are outside this document's scope.

Initial collection scope: Hyderabad and Bengaluru; angioplasty, knee replacement, cataract surgery, normal delivery, MRI scan, and doctor consultation. Exact clinical variants must be recorded separately when prices are not comparable. Initial scheme research covers PM-JAY, Aarogyasri, CGHS and ESIC. These names define research targets; this document makes no claim about current benefits, eligibility or hospital participation.

Existing mock records remain separate from newly sourced records. Existing identifiers are retained through a legacy-ID mapping where a researched hospital is confirmed to be the same facility.

## Shared conventions

- IDs: stable lowercase strings such as `hospital-hyd-001`, `treatment-001`, `scheme-001`, `source-001`. Never derive identity solely from a display name.
- Required fields must be populated before a record is accepted. Optional unknown values are null, never zero, an empty string or an invented value.
- Amounts: decimal INR values with two decimal places; never binary floating-point in persistent storage. Zero means explicitly free, supported by evidence.
- Dates: ISO `YYYY-MM-DD`; timestamps: ISO 8601 with timezone, stored in UTC. Effective date intervals include the start and exclude the end.
- Text: Unicode, trimmed; preserve official display names. Match aliases case-insensitively using a separate normalized value.
- Provenance status: `mock`, `sourced`, `verified`, or `stale`. Sourced means retrieved with evidence; verified means a reviewer checked the relevant claim against that evidence. It does not mean a hospital guaranteed a quote.
- Every externally asserted fact needs claim-level evidence. A source for a hospital address does not verify its prices or scheme acceptance.
- Arrays shown below become relationship tables in the database. CSV imports use separate relationship files, not comma-separated values inside cells.

## 1. Hospitals

One record represents one physical facility, not an entire hospital chain.

| Field | Type | Required | Definition |
|---|---|---|---|
| hospital_id | string | Yes | Stable primary key |
| legacy_id | string | No | Existing mock/API ID after identity review |
| name | string | Yes | Official facility name |
| city_id | foreign key | Yes | Canonical city |
| address | string | Yes | Facility street/area address |
| postal_code | string | No | Preserve leading zeros; validate as six digits for India |
| phone | string | No | Public facility contact; normalize to international format when possible |
| website | URL | No | Official facility URL |
| latitude, longitude | decimal | No | Both present together; valid geographic bounds |
| ownership_type | enum | No | government, private, trust, other, unknown |
| status | enum | Yes | active, inactive, unknown |
| provenance_status | enum | Yes | Shared provenance status |
| created_at, updated_at | timestamp | Yes | Audit timestamps |

Related tables: `hospital_specialties(hospital_id, specialty_id)` and `hospital_accreditations(id, hospital_id, accreditation_name, valid_from, valid_to, verification_status)`. Evidence attaches to each relationship claim as well as facility fields.

Do not collect patient information. Ratings are excluded initially because the current required API rating has no defined source or methodology. Distance is computed only against an explicit origin and method; it is not a permanent facility attribute.

## 2. Reference data and treatments

| Entity | Required fields | Optional fields / rules |
|---|---|---|
| City | city_id, name, state_code, country_code | country_code defaults to IN; aliases such as Bangalore map to Bengaluru |
| Specialty | specialty_id, name | aliases stored separately |
| Treatment | treatment_id, name, specialty_id, procedure_variant | description; variant must distinguish clinically different packages |
| Treatment alias | alias_id, treatment_id, alias, normalized_alias | An ambiguous alias produces clarification, not a silent first match |

Treatment names retain distinctions such as single-joint versus bilateral replacement, consultation specialty, MRI body region/contrast, and angioplasty package/stent assumptions. Source-specific procedure codes are recorded with their issuing authority in an optional treatment-code table.

## 3. Treatment prices

One row is one source-supported price observation for a defined treatment and scope. A price observation is not a patient quotation.

| Field | Type | Required | Definition |
|---|---|---|---|
| price_id | string | Yes | Primary key |
| treatment_id | foreign key | Yes | Exact treatment variant |
| hospital_id | foreign key | Conditional | Required for a facility-specific price |
| city_id | foreign key | Yes | Geographic scope; must match hospital city when facility-specific |
| price_scope | enum | Yes | hospital or city_benchmark |
| price_basis | enum | Yes | published_tariff, published_package, scheme_package, benchmark, mock |
| room_type | enum | No | General Ward, Semi-Private, Private Room, ICU; null if unspecified |
| minimum_inr, maximum_inr | decimal | Yes | Nonnegative; minimum <= maximum |
| currency | string | Yes | INR |
| billing_unit | enum | Yes | per_procedure, per_consultation, per_scan, per_day |
| length_of_stay_days | integer | No | Positive if supplied |
| valid_from, valid_to | date | No | Source-stated validity; unknown validity stays null |
| observed_on | date | Yes | Date source was accessed |
| provenance_status | enum | Yes | Shared provenance status |

Separate `price_components` rows contain component_id, price_id, component_name, inclusion_status (included/excluded/unknown), optional amount_inr and billing_unit. Record consultation, diagnostics, surgeon fees, implants, room charges, medicines and follow-up only where the source provides them. An unknown component must not be assigned a fabricated amount.

Scheme reimbursement packages remain separate from self-pay tariffs and cannot be presented as a patient's cash price. Multiple price observations are retained rather than overwritten.

Estimate policy for later implementation:

1. Resolve the exact treatment variant, city, facility if requested, room type and billing unit.
2. Select comparable, current observations with usable evidence; exclude mock records from sourced estimates.
3. Return unavailable when no compatible observations exist. Do not invent a generic procedure range.
4. Report the lowest compatible minimum and highest compatible maximum. A midpoint is a range midpoint, not an observed population average. Include observation count, source dates and assumptions.
5. Use a room multiplier only where a separately evidenced adjustment exists, with its baseline and applicability recorded. Otherwise return unavailable for that room category. Avoid adding a room charge twice to an inclusive package.

Optional adjustment table: adjustment_id, treatment_id, city_id, baseline_room_type, target_room_type, multiplier (>0), valid_from, valid_to, provenance_status. Each adjustment requires evidence.

## 4. Schemes and insurance

| Field | Type | Required | Definition |
|---|---|---|---|
| scheme_id | string | Yes | Stable primary key |
| name, short_code | string | Yes | Official name and code |
| category | enum | Yes | Government, State, Social Security, Private Subsidized |
| administrator | string | Yes | Responsible authority |
| official_portal | URL | Yes | Official source |
| eligibility_summary | string | Yes | Evidence-based summary, including limitations |
| claim_process_summary | string | No | Official process; missing stays null |
| coverage_limit_inr | decimal | No | Null where no single monetary limit applies |
| coverage_period | enum | No | annual, per_episode, other; required when a limit exists |
| coverage_unit | enum | No | individual, family, other; required when a limit exists |
| income_ceiling_inr | decimal | No | Requires income period and unit when specified |
| income_period, income_unit | string | Conditional | e.g. annual/household, only as supported by evidence |
| valid_from, valid_to | date | No | Policy/version validity |
| provenance_status | enum | Yes | Shared provenance status |

Separate tables:

- `scheme_locations`: scheme_id and applicable state_code; use an explicit national flag rather than text matching.
- `scheme_treatments`: scheme_id, treatment_id, optional package_code, coverage_status (covered/excluded/conditional/unknown), conditions, valid dates.
- `hospital_schemes`: relationship ID, hospital_id, scheme_id, participation_status (accepted/not_accepted/unknown), specialty/package restrictions, valid dates. Hospital acceptance does not prove a patient or treatment qualifies.
- `scheme_rules`: rule_id, scheme_id, attribute, operator, typed expected_value, rule_group_id, effective dates, explanation. Rule groups explicitly specify AND/OR; nested groups support combined conditions. Unsupported rules require manual review.

Matching outputs: `potentially_applicable`, `not_applicable`, or `needs_information`, with matched rules, failed rules, missing fields and source references. Never return confirmed entitlement from this dataset alone. Unknown required user attributes remain unknown. Do not persist personal eligibility answers in the initial data collection phase.

Private commercial insurance matching is deferred until insurer/policy-specific evidence is available. Scheme category labels do not establish private policy coverage.

## 5. Sources and claim evidence

| Entity | Required fields | Optional fields |
|---|---|---|
| Source | source_id, url, publisher, title, source_type, accessed_on | published_on, source_updated_on, archived_reference |
| Evidence | evidence_id, source_id, entity_type, entity_id, field_or_relationship, supporting_excerpt_or_locator, verification_status | reviewer, reviewed_on, next_review_on, notes |

Source types: official_hospital, official_scheme, government_tariff, official_insurer, secondary, mock. Prefer primary sources; secondary evidence remains clearly identified. Store short supporting excerpts or section/page locators rather than copying full copyrighted pages. Source URLs must be HTTP(S), but URL syntax alone does not establish credibility.

Proposed review schedule: prices and participation every 90 days; facility contact details every 180 days; scheme rules every 90 days and whenever a policy update is discovered. These intervals are project maintenance targets, not guarantees of freshness. Expired evidence becomes stale; renewal requires review. A record's display status cannot exceed the evidence status of the claims being displayed.

## 6. Compatibility with existing API models

Existing code remains untouched. An adapter and any model changes will require a later agreed integration step.

| Existing field | Proposed mapping / limitation |
|---|---|
| Hospital.id | legacy_id when confirmed; otherwise hospital_id |
| Hospital.specialties | Join hospital_specialties to specialty names |
| Hospital.indicative_costs | Selected comparable price summary keyed by treatment display name; summary policy must be agreed before integration |
| Hospital.accepted_schemes | Only current, evidence-supported hospital_schemes relationships |
| Hospital.phone | New data permits unknown; existing API requires string. Missing phone needs a contract decision |
| Hospital.rating | Existing API requires 1–5; no supported value initially. Do not fabricate; contract change needed |
| Hospital.distance_km | Existing API requires value; origin and calculation method must be agreed or field made optional |
| Hospital.verified / data_mode | Current model permits mock/verified only. Sourced/stale records cannot be falsely upgraded; extension or exclusion policy needed |
| CostEstimate range | Compatible comparable observation range |
| CostEstimate.average_cost | Existing name is misleading for midpoint; document semantics or revise by agreement |
| CostEstimate.room_multiplier | Only supported by an evidenced adjustment; unknown cannot silently become 1.0 |
| CostEstimate.covered_under_schemes | Candidate coverage only; current string list cannot express conditions or unknown eligibility |
| Scheme.coverage_limit | Existing field requires a number; proposed null/period/unit require an agreed extension |
| Scheme.claim_process_summary | Existing field requires string; unknown needs an agreed representation |
| List response data_mode | Existing single value cannot express mixed provenance; integration policy required |

The existing cost request lacks hospital_id and treatment variant identifiers. Procedure-specific hospital budget search also needs treatment context. These are proposed API extensions for Member 4 review, not changes in this task.

## 7. Member 4 acceptance and validation

- Primary keys unique; all foreign keys resolve; relationship duplicates rejected.
- Canonical city, specialty and treatment aliases resolve consistently; ambiguous treatment variants require clarification.
- Prices have valid bounds, scope, currency and billing units; city/facility mismatches rejected.
- Evidence exists for every non-mock externally asserted fact. Collection date is not substituted for publication or tariff validity date.
- Scheme limits include period/unit; eligibility rules preserve AND/OR semantics and effective dates.
- Mock and sourced data cannot be silently mixed; unsupported/expired data returns unavailable or needs-information with an explanation.
- Budget checks compare the requested treatment price, never an unrelated cheaper consultation.
- API contract mismatches above are explicit handoff items, not filled with fabricated defaults.

Suggested future fixtures: duplicate hospital ID; orphan treatment price; reversed price range; unsupported city; ambiguous treatment; missing phone/rating; stale tariff; scheme reimbursement versus cash price; unknown income; combined eligibility rules; expired hospital participation.

## 8. Next deliverables

After this specification is reviewed: create collection templates for each entity/relationship, collect a small primary-source dataset, validate it, then implement database import and independent services/tests. Coverage counts should reflect available evidence rather than a forced quota. This task creates only this specification; it does not collect or verify healthcare facts, create a database, register endpoints, or change existing code.
