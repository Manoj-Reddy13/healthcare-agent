# Healthcare data services — current layout and setup

## Layout

- backend/app/services/: database storage, price selection, directory lookup, eligibility rules, live provider retrieval and isolated demo data services.
- backend/app/data/datasets/: normalized JSON datasets, source evidence, research references and explicitly labelled demo fixtures.
- backend/app/data/schema/healthcare.sql: pilot database schema.
- backend/app/models/: new request models alongside the existing models.
- backend/app/api/: sourced-data, evidence and live-source endpoint modules alongside the original endpoints.
- backend/app/public_main.py: public-source-only application.
- backend/app/demo_main.py: optional database-backed demo with the original UI and agent tool selection.
- backend/tests/data_services/: contribution tests; original test files remain unchanged.
- backend/scripts/: setup, launch, import/rebuild, diagnostics and CI verification.
- backend/requirements-data.txt, requirements-integration.txt and requirements-public.txt: tested dependency groups, without changing the original requirements.txt.
- .github/workflows/healthcare-verification.yml: CI workflow.

There is no member3_extension source folder. Earlier design notes under docs/data-services describe prior stages; this guide is the current authority for paths and commands. The original frontend and backend source files are preserved.

## Commands

Run these from the backend directory in an activated Python environment:

```text
python -m pip install -r requirements-integration.txt
python -m scripts.rebuild
python -m scripts.doctor
python -m scripts.ci_verify
```

For the no-credential public-source API:

```text
python -m uvicorn app.public_main:app --host 127.0.0.1 --port 8001
```

On Windows, backend/scripts/start-public.ps1 performs setup if needed. It installs the public dependency group in backend/.local/public-venv and runs the 14 public-source tests. Open http://127.0.0.1:8001/docs.

The optional demo is started with backend/scripts/start-demo.ps1. It builds an isolated copy of the original frontend, uses backend/.local for generated assets/databases, and serves the sample-data UI at port 8000. It is not the verified-live target.

To run the contribution tests directly:

```text
python -m unittest discover -s tests/data_services -v
```

The original backend tests remain tests/test_api.py, tests/test_agent.py and tests/test_services.py. CI runs them separately so original behavior and new behavior are independently visible.

## What can be completed now

File placement, imports, database schema/import tools, local APIs, documented contracts, local testing and the CI definition can be completed without new external accounts. Those implementations and checks are available in this contribution.

## What is still missing

1. Verified hospital package prices: requires supported current tariffs/quotation APIs, exact treatment variants and package terms. Public clinic prices do not establish hospital surgery quotes.
2. Real insurance/scheme authorization: requires authorized insurer or government production access. Sample matching and age screening cannot confirm benefits.
3. Full verified-live UI connection: the current UI has mock fallback and mandatory rating/distance assumptions. Changes to those owned frontend connection points must be agreed with your friend; they were not silently altered.
4. Team API agreement: the contract is documented, but your friend must review/accept the source and unavailable-data semantics.
5. GitHub CI, PR review and merge: needs a connected authorized GitHub account and actual review. No commit, push or merge has been claimed.

These are concrete remaining dependencies. File relocation alone does not turn the partial verified-live items into completed integrations.
