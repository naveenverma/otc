const OTC_BASE = "https://www.otcmarkets.com";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtmlWithRetry(url, timeoutMs, retries) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
        }
      });
      clearTimeout(timer);
      if (!resp.ok) {
        lastError = new Error(`HTTP ${resp.status} ${url}`);
      } else {
        return await resp.text();
      }
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
    }
    if (attempt < retries) await sleep(500 * (attempt + 1));
  }
  throw lastError || new Error(`Failed fetch: ${url}`);
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMarketChange(securityHtml) {
  const patterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(Market\s+change\s+from\s+.+?(?:to|→)\s+.+?)(?:<|$)/gi,
    /Market\s+Change[^<]*?(\d{1,2}\/\d{1,2}\/\d{4})[^<]*?(from\s+.+?(?:to|→)\s+.+?)(?:<|$)/gi,
    /corporate-action[^>]*>[^<]*(\d{1,2}\/\d{1,2}\/\d{4})[^<]*(Market\s+[Cc]hange[^<]*)/gi
  ];
  const hits = [];
  for (const p of patterns) {
    p.lastIndex = 0;
    let m = null;
    while ((m = p.exec(securityHtml)) !== null) {
      hits.push({
        date: stripHtml(m[1] || ""),
        desc: stripHtml(m[2] || "")
      });
    }
  }
  if (!hits.length) return "";
  const top = hits[0];
  return `${top.date} ${top.desc}`.trim();
}

function extractByLabel(html, label) {
  const safe = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`${safe}\\s*<\\/[^>]+>\\s*<[^>]*>\\s*([^<]{1,300})<`, "i"),
    new RegExp(`${safe}\\s*:\\s*([^<\\n\\r]{1,300})`, "i"),
    new RegExp(`${safe}[^<]{0,20}<[^>]*>([\\s\\S]{1,500}?)<\\/`, "i")
  ];
  for (const p of patterns) {
    const m = p.exec(html);
    if (m?.[1]) {
      const t = stripHtml(m[1]);
      if (t) return t;
    }
  }
  return "";
}

function parseTier(html) {
  const patterns = [
    /class="[^"]*tier[^"]*"[^>]*>([^<]+)</i,
    /"tierName"\s*:\s*"([^"]+)"/i,
    /(Expert\s+Market|Pink\s+Limited|Pink\s+Current|Venture\s+Market|Grey\s+Market|OTCQX|OTCQB)/i
  ];
  for (const p of patterns) {
    const m = p.exec(html);
    if (m?.[1]) return stripHtml(m[1]);
  }
  return "Not Available";
}

export async function fetchTickerOtcSnapshot(ticker, { timeoutMs, retries }) {
  const upper = String(ticker || "").trim().toUpperCase();
  const securityUrl = `${OTC_BASE}/stock/${encodeURIComponent(upper)}/security`;
  const profileUrl = `${OTC_BASE}/stock/${encodeURIComponent(upper)}/profile`;

  const [securityHtml, profileHtml] = await Promise.all([
    fetchHtmlWithRetry(securityUrl, timeoutMs, retries),
    fetchHtmlWithRetry(profileUrl, timeoutMs, retries)
  ]);

  const marketChange = parseMarketChange(securityHtml);
  const description = extractByLabel(profileHtml, "Business Description") || extractByLabel(profileHtml, "Description") || "Not Available";
  const employees = extractByLabel(profileHtml, "Employees") || "Not Available";
  const products = extractByLabel(profileHtml, "Products and Services") || extractByLabel(profileHtml, "Products & Services") || "Not Available";
  const tier = parseTier(profileHtml);
  const sharesOutstanding =
    extractByLabel(securityHtml, "Shares Outstanding") ||
    extractByLabel(securityHtml, "Shares Outstanding on") ||
    extractByLabel(securityHtml, "Shares Outstanding as of") ||
    "Not Available";

  return {
    marketChange,
    description,
    employees,
    products,
    tier,
    sharesOutstanding
  };
}

