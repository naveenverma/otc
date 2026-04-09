import "dotenv/config";
import pLimit from "p-limit";
import { config } from "./config.js";
import { createSheetsClient, readTickers, writeOtcResults } from "./sheets.js";
import { fetchTickerOtcSnapshot } from "./otc.js";

function nowIso() {
  return new Date().toISOString();
}

function printSummary(summary) {
  console.log("---- OTC NODE DEMO SUMMARY ----");
  console.log(`Started: ${summary.startedAt}`);
  console.log(`Ended:   ${summary.endedAt}`);
  console.log(`Tickers: ${summary.total}`);
  console.log(`Success: ${summary.success}`);
  console.log(`Nulls:   ${summary.nulls}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Errors:  ${summary.errors}`);
  if (summary.errorTickers.length) {
    console.log(`Error tickers: ${summary.errorTickers.join(", ")}`);
  }
}

async function run() {
  const sheets = createSheetsClient(config.serviceAccountJson);
  const tickerRows = await readTickers(sheets, {
    spreadsheetId: config.spreadsheetId,
    sheetName: config.sheetName,
    tickerCol: config.tickerCol,
    dataStartRow: config.dataStartRow,
    maxTickers: config.maxTickers
  });

  if (!tickerRows.length) {
    console.log("No tickers found; exiting.");
    return;
  }

  const startedAt = nowIso();
  const limit = pLimit(config.concurrency);
  const resultsByRow = {};
  const counters = {
    total: tickerRows.length,
    success: 0,
    nulls: 0,
    skipped: 0,
    errors: 0,
    errorTickers: []
  };

  await Promise.all(
    tickerRows.map((item) =>
      limit(async () => {
        const ticker = item.ticker;
        const row = item.row;
        if (config.otcSkipTickers.includes(ticker)) {
          counters.skipped += 1;
          counters.nulls += 1;
          resultsByRow[row] = {
            marketChange: "",
            description: "Not Available",
            employees: "Not Available",
            tier: "Not Available",
            products: "Not Available",
            sharesOutstanding: "Not Available"
          };
          console.log(`[${ticker}] skipped by OTC_SKIP_TICKERS`);
          return;
        }

        try {
          const snapshot = await fetchTickerOtcSnapshot(ticker, {
            timeoutMs: config.requestTimeoutMs,
            retries: config.retryCount
          });
          const hasAny =
            !!snapshot.marketChange ||
            snapshot.description !== "Not Available" ||
            snapshot.employees !== "Not Available" ||
            snapshot.products !== "Not Available" ||
            snapshot.tier !== "Not Available" ||
            snapshot.sharesOutstanding !== "Not Available";
          if (hasAny) counters.success += 1;
          else counters.nulls += 1;
          resultsByRow[row] = snapshot;
          console.log(`[${ticker}] ok`);
        } catch (error) {
          counters.errors += 1;
          counters.nulls += 1;
          counters.errorTickers.push(ticker);
          resultsByRow[row] = {
            marketChange: "",
            description: "Not Available",
            employees: "Not Available",
            tier: "Not Available",
            products: "Not Available",
            sharesOutstanding: "Not Available"
          };
          console.log(`[${ticker}] error: ${error.message}`);
        }
      })
    )
  );

  await writeOtcResults(sheets, config.spreadsheetId, config.sheetName, resultsByRow);

  const summary = {
    ...counters,
    startedAt,
    endedAt: nowIso()
  };
  printSummary(summary);
}

run().catch((error) => {
  console.error("Fatal run error:", error);
  process.exitCode = 1;
});

