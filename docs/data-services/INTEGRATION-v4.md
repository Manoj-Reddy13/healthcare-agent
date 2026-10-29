# Shared-server integration preview

29 October 2026. New files only; no previous source or deliverable edits.

## What changed

`combined_server.py` imports the existing FastAPI route implementations and adds our Member 3 routes to one local server. This makes both sets of endpoints available on port 8000 and gives them one generated API schema. It does not replace the existing agent, modify the React client, or route existing chat tools into our new data services.

Original `/api/*` routes keep their original behavior and mock data. Our sourced routes remain under `/api/v2/data/*`. `/integration/status` explicitly reports that the original UI and agent have not switched to sourced services. Endpoint tests verify that both namespaces coexist, original appointment consent remains enforced, and no method/path collisions exist.

## Run in this workspace

Stop any other local server using port 8000, then run:

```powershell
./run-combined-preview.ps1
```

Open `http://127.0.0.1:8000/docs`. The existing frontend can continue using its existing backend address; it will still receive the original mock-service behavior. This is compatibility preservation, not a completed sourced-data connection.

For a cloned backend elsewhere:

```powershell
./run-combined-preview.ps1 -OriginalBackend 'C:\path\to\healthcare-agent\backend'
```

For a portable Python environment, install requirements-integration-v4.txt, set HEALTHCARE_ORIGINAL_BACKEND to the original repository's backend folder, set MEMBER3_DATABASE to healthcare-directory-v3.sqlite, and run:

```powershell
python -m uvicorn combined_server:app_factory --factory --host 127.0.0.1 --port 8000
```

The Python factory registers the currently inspected apps' HTTP routes and our local CORS policy. It is not a generic merger of future startup handlers, custom middleware or exception handlers. Recheck integration if the original app adds those features. Only load a trusted local clone: importing its application executes its Python code.

## Contract audit

`compatibility_audit.py` validates candidate sourced hospital responses and an unavailable cost response against the actual original Pydantic models. It is read-only and never feeds invalid records into the UI. `compatibility-audit-v4.json` records the expected mismatches: missing ratings/distances, unsupported sourced provenance and a cost contract without an unavailable form.

These findings confirm why a direct switch is not yet safe. A new backend launcher can share hosting without changing old files, but it cannot make the current `HospitalCard` display an unknown rating: that component calls `hospital.rating.toFixed(1)`. Supplying zero or an invented rating would conceal the data gap. Your friend needs to implement the agreed missing-data/provenance handling in his owned connection points before the final switch.

## Tests and remaining work

Ten shared-server tests verify original and new routes together. Two contract-audit tests prove the compatibility blockers are detected. Previous service/API tests and the original backend baseline remain available. New tests are independent of the frontend implementation.

Current self-pay prices and real executable eligibility/participation data remain incomplete. No new real prices, scheme approvals, UI changes, agent changes, PRs or release claims are introduced by this step. The next coordinated step is to settle the audited contracts with your friend while continuing source collection.
