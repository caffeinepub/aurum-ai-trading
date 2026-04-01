// Live XAUUSD price — fetched from multiple free public sources
let _price = 3300.0;
let _lastFetchedPrice = 0;

export function getLivePrice(): number {
  return _price;
}
export function setLivePrice(p: number): void {
  _price = +p.toFixed(2);
}
export function tickLivePrice(): number {
  const tick = (Math.random() - 0.498) * 0.4;
  _price = +(_price + tick).toFixed(2);
  return _price;
}

/** Try goldprice.org — no API key, no CORS block */
async function tryGoldPriceOrg(): Promise<number | null> {
  try {
    const res = await fetch("https://data-asg.goldprice.org/dbXRates/USD", {
      headers: { "x-requested-with": "XMLHttpRequest" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.items?.find((i: { curr: string }) => i.curr === "USD");
    const price = item?.xauPrice;
    if (price && typeof price === "number" && price > 1500) return price;
  } catch (_) {
    /* fall through */
  }
  return null;
}

/** Try Yahoo Finance GC=F (gold futures) */
async function tryYahooFinance(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1m&range=1d",
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price && typeof price === "number" && price > 1500) return price;
  } catch (_) {
    /* fall through */
  }
  return null;
}

/** Try metals.live */
async function tryMetalsLive(): Promise<number | null> {
  try {
    const res = await fetch("https://api.metals.live/v1/spot");
    if (!res.ok) return null;
    const data = await res.json();
    const gold = Array.isArray(data) ? data[0]?.gold : data?.gold;
    if (gold && typeof gold === "number" && gold > 1500) return gold;
  } catch (_) {
    /* fall through */
  }
  return null;
}

export async function fetchRealPrice(): Promise<number> {
  // Try sources in order — first success wins
  const price =
    (await tryGoldPriceOrg()) ??
    (await tryYahooFinance()) ??
    (await tryMetalsLive());

  if (price && price > 1500) {
    _lastFetchedPrice = price;
    setLivePrice(price);
    return price;
  }

  // All sources failed — keep last known real price if available
  if (_lastFetchedPrice > 1500) {
    setLivePrice(_lastFetchedPrice);
    return _lastFetchedPrice;
  }

  return _price;
}
