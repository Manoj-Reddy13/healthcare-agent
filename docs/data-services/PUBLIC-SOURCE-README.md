# Public-source edition — no provider account required

This is the suitable runnable version while hospital/insurer API access is unavailable. It fetches official provider clinic listings at request time and never falls back to demo prices or historical research records.

## Start

Extract the focused ZIP to a folder you control. From that folder in PowerShell:

```powershell
./start-public.ps1
```

The first run creates a local Python environment, installs requirements-public.txt and runs 14 focused tests. Requires Python 3.10+ and internet access. Then open http://127.0.0.1:8001/docs. Stop with Ctrl+C. No API key, Node installation, original repository or patient information is required for this focused edition.

For other platforms, create/activate a Python environment, install requirements-public.txt, then run:

```text
python -m unittest -v test_live_public test_public_access
python -m uvicorn public_access_app:app --host 127.0.0.1 --port 8001
```

## Try

1. GET /api/live/products to see the two supported source products.
2. GET /api/live/providers?city=Hyderabad to fetch current clinic listings.
3. GET /api/live/providers?product_id=mri-knee-single-hyderabad&max_published_amount=8000 to filter that exact product's published amount.
4. Copy a provider_id from the result and call /api/live/published-price/{product_id}/{provider_id}.
5. Read /api/live/capabilities for the actual supported scope.

Source failures return 503. A clinic missing from the current listing returns 404. Invalid or context-free budget filters return 422. Success includes a UTC retrieval timestamp, source URL, document hash and explicit quote/coverage flags. .local/public-audit.sqlite stores successful source-fetch evidence; no patient records are collected.

The fixed catalog covers a Hyderabad single-knee MRI product and a Bengaluru plain-brain MRI product. These are clinic listing prices, not verified patient quotations or hospital prices for all six treatment families. No totals, surgery estimates or insurer payment promises are inferred from them.

## Files

- public_access_app.py: recommended API entry point and live search/lookup.
- live_public.py: restricted-source HTTP retrieval, parsing and audit storage.
- live_api.py: basic live status/products/price endpoints.
- data_layer.py: shared money validation helpers. Its earlier offline import utilities are not invoked or supplied with demo datasets in this package.
- test_live_public.py and test_public_access.py: 14 isolated tests using synthetic parser fixtures; they do not pretend to be live provider verification.
- requirements-public.txt and setup/start-public.ps1: installation and startup.

The standalone package excludes the demo app, demo seed, old UI and private-integration placeholders. The existing full repository extension remains available separately; its earlier files are preserved.

## Completion boundary

This limited public-source version is working. Your full verified-live Member 3/4 target is not complete: confirmed hospital quotations, insurance authorization and government beneficiary checks still require authorized production provider access and approved API contracts. Existing UI fallback behavior also needs an agreed update before it can be used for verified-live results. No credentials or patient identifiers should be pasted into chat.
