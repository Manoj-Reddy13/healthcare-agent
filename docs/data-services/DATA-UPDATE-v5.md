# Stage 5: real published evidence

29 October 2026. New source records and a separate evidence API, with no edits to earlier files.

## Data collected

The [Apollo 24|7 single-knee MRI listing](https://www.apollo247.com/radiology-details/mri-knee-joint-single-c-hyderabad) lists INR 7000 at Kondapur and INR 7100 at each of its Nizmapet and Chanda Nagar clinics. Three provider-specific observations are stored in `published-evidence-v5.json`, with their source, access date and unknown fields.

These are clinic listing amounts, not prices for the Jubilee Hills or Bannerghatta pilot hospitals. Hyderabad is the service-city label from the listing, not a new geocoding or municipality assertion. The listing does not establish contrast status, sedation, package inclusions, tariff validity or clinical equivalence to the existing non-contrast treatment variant. Those fields remain null. The observation API labels each record estimator_eligible=false. Values were retrieved through the web research tool; price availability must be reconfirmed with the provider before booking.

A [Lok Sabha answer dated 6 February 2026](https://sansad.in/getFile/loksabhaquestions/annex/187/AU1224_s8ptc6.pdf?source=pqals) confirms that the PM-JAY senior pathway covers age 70 and above independently of socio-economic status. It also describes other beneficiary pathways. The dataset captures this as a dated official snapshot, not a complete current policy or proof of individual entitlement.

## New endpoints

| Method / route | Purpose |
|---|---|
| GET /api/v3/evidence/prices | Provider-specific published price observations; optional city and provider_name filters |
| GET /api/v3/evidence/policies | Dated official scheme facts and sources |
| POST /api/v3/evidence/pmjay/senior-path-screen | Limited age-path screening; input age is an optional strict integer |

Age screening returns needs_information without age, potential_senior_path_candidate at 70+, and other_path_may_apply below 70. It never rejects all PM-JAY eligibility based solely on age and never confirms entitlement. It cites the source date and identifies enrollment, current requirements, treatment coverage and hospital participation as separate checks. It does not save personal answers.

These endpoints provide usable evidence without forcing incomplete records into the stricter cost-estimate or full-policy schemas. The original `/api/*` and our `/api/v2/data/*` behavior remain intact.

## Run

Use `./run-evidence-preview-v5.ps1` in this workspace. For another machine, install requirements-integration-v4.txt, set HEALTHCARE_ORIGINAL_BACKEND and MEMBER3_DATABASE as described in INTEGRATION-v4.md, and run:

```powershell
python -m uvicorn evidence_api_v5:app_factory --factory --host 127.0.0.1 --port 8000
```

Open `/docs`, GET the prices endpoint, then POST `{"age":70}` to the senior screening endpoint. All namespaces share the same local host. Stop any previous preview server before using its port.

## Remaining boundaries

The collection step is still partial: only one treatment family has these new published provider observations, and no new record satisfies the full reviewed cost-estimator requirements. There is no approved full-policy dataset or accepted hospital-scheme participation dataset. The original UI/agent still need agreed contract changes to consume sourced services. Earlier source conflicts, including Aarogyasri, remain documented and unresolved.
