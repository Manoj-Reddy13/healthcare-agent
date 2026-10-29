# Expanded treatment evidence — 29 October 2026

This update adds files only. It preserves the original application, earlier data and earlier source packages.

## Added evidence

14 new reference records from seven primary sources. These supplement the earlier three Hyderabad clinic observations; they do not overwrite them.

| Family | New evidence | Boundary |
|---|---|---|
| Angioplasty | Two Hyderabad guide ranges from Yashoda | Different published procedure contexts; keep separate |
| Knee replacement | Two Hyderabad guide ranges from different sections of one Yashoda page | Different descriptions; no blended average or inferred implant/laterality |
| Cataract | One Hyderabad guide point and one Bengaluru FAQ range | Neither is a facility/package quotation |
| Normal delivery | One Hyderabad range and one approximate point | The point is publisher guidance, not a calculated average |
| MRI | Five Bengaluru provider-specific brain scan listings | Different anatomy from earlier Hyderabad knee listings |
| Consultation | One conditional CGHS reference fee | Scheme allowance, excluded from default cash guidance |

Sources:

- [Yashoda angioplasty guide](https://www.yashodahospitals.com/procedure-cost/angioplasty-cost-in-india/) and [coronary procedure guide](https://www.yashodahospitals.com/procedure-cost/coronary-angioplasty-cost-in-hyderabad/).
- [Yashoda knee replacement guide](https://www.yashodahospitals.com/procedure-cost/knee-replacement-surgery-cost-in-india/).
- [Yashoda cataract guide](https://www.yashodahospitals.com/procedure-cost/cataract-surgery-cost-in-india/).
- [Yashoda delivery guide](https://www.yashodahospitals.com/procedure-cost/normal-delivery-cost-in-hyderabad/).
- [Apollo Bengaluru brain scan listing](https://www.apollo247.com/radiology-details/mri-brain-plain-c-bengaluru).
- [Government-circulated CGHS clarification](https://cdnbbsr.s3waas.gov.in/s32d2ca7eedf739ef4c3800713ec482e1a/uploads/2026/05/2026051571.pdf).

The data file records each amount, evidence class, context and section locator. Values are exact decimal INR strings. Unknown dates and package fields remain unknown. Source access records retrieval through the research tool, not confirmation of a live booking price. No source doctor contact form, booking or callback was submitted.

## Run the expanded preview

After setup.ps1 has been run, use:

```powershell
./run-expanded.ps1
```

Manual command from this extension folder:

```text
python -m uvicorn expanded_evidence:app_factory --factory --host 127.0.0.1 --port 8000
```

This adds to the existing shared server; all earlier API namespaces remain available. The earlier run.ps1 deliberately retains its earlier behavior.

## New read-only endpoints

- GET `/api/v3/evidence/treatment-guides`: optional family, city and include_scheme_references. Scheme references are excluded by default.
- GET `/api/v3/evidence/coverage`: reference counts by family and city with explicit completion flags.
- GET `/api/v3/evidence/references/{record_id}`: source, context and any related published figures.

Examples:

```text
/api/v3/evidence/treatment-guides?family=angioplasty&city=Hyderabad
/api/v3/evidence/treatment-guides?family=mri&city=Bangalore
/api/v3/evidence/treatment-guides?family=consultation&include_scheme_references=true
/api/v3/evidence/references/knee-hyd-average-guide
```

The coverage endpoint reports reference presence across all six families, but complete_cost_dataset=false. It does not suggest all six treatments have valid hospital tariffs, both-city coverage or approved estimator inputs.

## Validation and tests

Validation rejects malformed price ranges, invalid primary-source domains, duplicate identities, unresolved references, incorrect evidence classes, invented hospital mappings, false estimator approval and assumed tariff validity dates. Source class and row class must agree so a scheme fee cannot be relabelled as cash guidance.

Tests verify the new API, source separation, city filtering, separate conflicting figures, unknown-reference errors and continued availability of old endpoints. Synthetic test prices remain confined to temporary databases.

## Remaining work

No new reference is promoted into the reviewed cost-estimate table. Complete package details and valid facility-specific tariffs remain necessary. Full scheme/participation data and the final UI/agent source-aware connection are still outstanding. This is an evidence coverage improvement, not a completed project release.
