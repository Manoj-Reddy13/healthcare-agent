# Member 4 continuous verification

The new `.github/workflows/member3-member4-verification.yml` checks the extension and original application without modifying their existing source files. Place this workflow at the repository root's .github/workflows path along with the new backend/member3_extension folder.

## Checks

- Backend jobs on Windows and Ubuntu, using Python 3.13 and the extension's tested dependency constraints.
- Database rebuild, data coverage report and the original-contract compatibility audit.
- Extension unittest suite and original backend pytest suite. Zero collected tests cannot be reported as success.
- Hash check that the original backend application and frontend source files remain unchanged during the checks.
- A separate frontend job using Node 24, the existing package-lock.json, npm ci and the existing build command.
- Test logs, backend JUnit XML, diagnostics, data coverage and compatibility reports uploaded as job artifacts; frontend compiled output uploaded separately.

The workflow runs on relevant pull requests, changes to main or feature/healthcare-data, and manual dispatch. It uses read-only repository permissions and makes no commit, push, merge or deployment. No paid model keys or healthcare API credentials are required for the static local datasets and existing mock agent tests.

## Local equivalent

After setting up the extension environment:

```text
python backend/member3_extension/ci_verify.py --reports LOCAL_REPORT_FOLDER
```

From the frontend folder, npm ci --ignore-scripts --no-audit --no-fund followed by npm run build reproduces the frontend job. Use a separate checkout if you want dependency installation and build output isolated from your development folder. The existing package files are preserved.

## Validation performed

The backend CI command passed locally: 90 extension tests and 16 original backend tests, with unchanged original source hashes. The frontend locked-install/build check and workflow syntax results are recorded in CI-VERIFICATION.json. The workflow itself has not run on GitHub because these local additions have not been committed or pushed. Ubuntu runner execution remains unverified until GitHub runs that job.

The action versions follow the current official usage examples: [checkout](https://github.com/actions/checkout), [Python setup](https://github.com/actions/setup-python), [Node setup](https://github.com/actions/setup-node), [artifact upload](https://github.com/actions/upload-artifact). YAML parsing and local job-command checks are not a substitute for a GitHub-hosted workflow run.

## How to review a result

Read summary.json first, then test logs if a check fails. Review coverage.json and compatibility.json even when tests pass: missing clinical-price data and incompatible source-aware UI contracts remain explicit limitations, not hidden test failures. Passing CI does not confirm treatment prices, patient eligibility or a complete application release.

When you and your friend are ready, include these additions in a reviewed PR. The workflow will become available when it exists on the pushed branch. No branch protection or repository settings have been changed.
