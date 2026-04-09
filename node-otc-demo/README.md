# OTC Node Demo (No VPS)

This is a small Node worker to demonstrate faster OTC processing vs Apps Script, while still writing results into the same Google Sheet.

## What it does

- Reads first `MAX_TICKERS` symbols from column A
- Fetches OTC `security` + `profile` pages with retry + timeout
- Parses:
  - Market Change text (column N)
  - Description (H)
  - Employees (M)
  - OTC Tier (P)
  - Products & Services (Q)
  - Shares Outstanding (AA)
- Writes results back in one batch
- Supports skip list via `OTC_SKIP_TICKERS`

## 1) Prepare Google access

1. Create a Google Cloud service account.
2. Generate key JSON.
3. Share your target sheet with the service account email as **Editor**.
4. Add the JSON in GitHub Secret: `GOOGLE_SERVICE_ACCOUNT_JSON`.

## 2) GitHub Secrets

Set these in repository secrets:

- `GOOGLE_SERVICE_ACCOUNT_JSON` (required)
- `SPREADSHEET_ID` (required)
- `SHEET_NAME` (default `Project Sheet`)
- `TICKER_COL` (default `1`)
- `DATA_START_ROW` (default `2`)
- `MAX_TICKERS` (default `25`)
- `CONCURRENCY` (default `5`)
- `REQUEST_TIMEOUT_MS` (default `12000`)
- `RETRY_COUNT` (default `2`)
- `OTC_SKIP_TICKERS` (e.g. `AAGR,AAPJ`)

## 3) Run via GitHub Actions

Workflow file: `.github/workflows/otc-node-demo.yml`

- Open **Actions** tab
- Run **OTC Node Demo** manually (`workflow_dispatch`)
- Check logs for per-ticker status and summary

## 4) Local run (optional)

```bash
cd node-otc-demo
npm install
cp .env.example .env
# fill env vars or export them in shell
npm run run:otc
```

## Notes

- This demo is designed to prove runtime behavior and resilience.
- It does not replace the Apps Script project yet.
- If this performs well, next step is to convert into a scheduled production worker with stronger observability.

