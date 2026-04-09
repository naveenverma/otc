function parseIntSafe(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
}

function getRequired(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  spreadsheetId: getRequired("SPREADSHEET_ID"),
  sheetName: process.env.SHEET_NAME || "Project Sheet",
  tickerCol: parseIntSafe(process.env.TICKER_COL, 1),
  dataStartRow: parseIntSafe(process.env.DATA_START_ROW, 2),
  maxTickers: parseIntSafe(process.env.MAX_TICKERS, 25),
  concurrency: Math.max(1, parseIntSafe(process.env.CONCURRENCY, 5)),
  requestTimeoutMs: Math.max(3000, parseIntSafe(process.env.REQUEST_TIMEOUT_MS, 12000)),
  retryCount: Math.max(0, parseIntSafe(process.env.RETRY_COUNT, 2)),
  otcSkipTickers: parseCsv(process.env.OTC_SKIP_TICKERS),
  serviceAccountJson: getRequired("GOOGLE_SERVICE_ACCOUNT_JSON")
};

