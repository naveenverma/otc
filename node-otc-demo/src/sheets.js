import { google } from "googleapis";

function parseServiceAccount(rawJson) {
  try {
    return JSON.parse(rawJson);
  } catch (error) {
    throw new Error(`Invalid GOOGLE_SERVICE_ACCOUNT_JSON: ${error.message}`);
  }
}

export function createSheetsClient(serviceAccountJson) {
  const creds = parseServiceAccount(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  return google.sheets({ version: "v4", auth });
}

function colToA1(colIndexOneBased) {
  let col = colIndexOneBased;
  let result = "";
  while (col > 0) {
    const remainder = (col - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    col = Math.floor((col - 1) / 26);
  }
  return result;
}

export async function readTickers(sheets, { spreadsheetId, sheetName, tickerCol, dataStartRow, maxTickers }) {
  const col = colToA1(tickerCol);
  const endRow = dataStartRow + maxTickers - 1;
  const range = `${sheetName}!${col}${dataStartRow}:${col}${endRow}`;
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = resp.data.values || [];
  return values
    .map((row, idx) => ({
      row: dataStartRow + idx,
      ticker: String(row?.[0] || "").trim().toUpperCase()
    }))
    .filter((item) => item.ticker);
}

export async function writeOtcResults(sheets, spreadsheetId, sheetName, resultsByRow) {
  // Columns:
  // N(14)=Date Moved, H(8)=Description, M(13)=Employees, P(16)=OTC Tier, Q(17)=Products, AA(27)=Shares
  const updates = [];
  for (const [rowStr, result] of Object.entries(resultsByRow)) {
    const row = Number(rowStr);
    if (!Number.isFinite(row)) continue;
    updates.push({
      range: `${sheetName}!N${row}:N${row}`,
      values: [[result.marketChange || ""]]
    });
    updates.push({
      range: `${sheetName}!H${row}:H${row}`,
      values: [[result.description || "Not Available"]]
    });
    updates.push({
      range: `${sheetName}!M${row}:M${row}`,
      values: [[result.employees || "Not Available"]]
    });
    updates.push({
      range: `${sheetName}!P${row}:P${row}`,
      values: [[result.tier || "Not Available"]]
    });
    updates.push({
      range: `${sheetName}!Q${row}:Q${row}`,
      values: [[result.products || "Not Available"]]
    });
    updates.push({
      range: `${sheetName}!AA${row}:AA${row}`,
      values: [[result.sharesOutstanding || "Not Available"]]
    });
  }

  if (!updates.length) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: updates
    }
  });
}

