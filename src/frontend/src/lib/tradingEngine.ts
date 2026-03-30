// ============================================================
// AuTrader — Core Algorithmic Trading Engine
// XAUUSD (Gold) Multi-Strategy Confluence System
// ============================================================

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  rsi: number[];
  macdLine: number[];
  macdSignal: number[];
  macdHist: number[];
  ema20: number[];
  ema50: number[];
  ema200: number[];
  vwap: number[];
  atr: number[];
}

export interface OrderBlock {
  type: "bullish" | "bearish";
  high: number;
  low: number;
  index: number;
}

export interface FVG {
  type: "bullish" | "bearish";
  high: number;
  low: number;
  index: number;
}

export interface LiquidityZone {
  type: "high" | "low";
  level: number;
}

export interface SMCAnalysis {
  orderBlocks: OrderBlock[];
  bos: { type: "bullish" | "bearish"; level: number } | null;
  choch: { type: "bullish" | "bearish"; level: number } | null;
  liquidityZones: LiquidityZone[];
}

export interface ICTAnalysis {
  fvgs: FVG[];
  killZone: { name: string; active: boolean };
  ote: { level: number; inZone: boolean } | null;
}

export interface SRLevels {
  supports: number[];
  resistances: number[];
}

export interface SignalResult {
  direction: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  rrRatio: number;
  confidence: number;
  tradeType: "Scalp" | "Intraday" | "Swing";
  reasoning: string;
  tags: string[];
}

export interface BacktestTrade {
  entryPrice: number;
  exitPrice: number;
  direction: "BUY" | "SELL";
  outcome: "WIN" | "LOSS" | "BREAKEVEN";
  pnlPips: number;
  confidence: number;
}

export interface BacktestStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
  equityCurve: number[];
}

// ─── Timeframe config ────────────────────────────────────────
const TF_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1H": 3600,
  "4H": 14400,
  D: 86400,
};
const TF_VOL: Record<string, number> = {
  "1m": 0.0006,
  "5m": 0.0014,
  "15m": 0.0025,
  "1H": 0.005,
  "4H": 0.011,
  D: 0.022,
};

// ─── Candle Generation ────────────────────────────────────────
export function generateCandles(timeframe: string, count = 300): Candle[] {
  const interval = TF_SECONDS[timeframe] ?? 3600;
  const vol = TF_VOL[timeframe] ?? 0.005;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - interval * count;

  const candles: Candle[] = [];
  let price = 2648 + (Math.random() - 0.5) * 30;

  // Seeded pseudo-random for reproducibility per timeframe
  let seed = interval;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  for (let i = 0; i < count; i++) {
    // Add macro trend cycles
    const macro = Math.sin(i / (count * 0.3)) * vol * 8;
    const micro = Math.sin(i / 12) * vol * 2;
    const drift = macro * 0.1 + micro * 0.05 + (rand() - 0.492) * vol;

    const open = price;
    const bodyChange = drift + (rand() - 0.5) * vol * 1.8;
    const close = open * (1 + bodyChange);

    const wickFactor = 0.3 + rand() * 0.7;
    const highAdj = Math.abs(bodyChange) * wickFactor + rand() * vol * 0.8;
    const lowAdj = Math.abs(bodyChange) * wickFactor + rand() * vol * 0.8;

    const high = Math.max(open, close) + open * highAdj;
    const low = Math.min(open, close) - open * lowAdj;
    const volume = 40000 + rand() * 160000 + Math.abs(bodyChange) * 2000000;

    candles.push({
      time: startTime + i * interval,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.round(volume),
    });
    price = close;
  }
  return candles;
}

// ─── EMA ─────────────────────────────────────────────────────
function calcEMA(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(Number.NaN);
  if (values.length < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  result[period - 1] = sum / period;
  for (let i = period; i < values.length; i++) {
    result[i] = values[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

// ─── RSI ─────────────────────────────────────────────────────
function calcRSI(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(Number.NaN);
  if (closes.length <= period) return result;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain += Math.max(0, d);
    avgLoss += Math.max(0, -d);
  }
  avgGain /= period;
  avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

// ─── MACD ────────────────────────────────────────────────────
function calcMACD(closes: number[]): {
  line: number[];
  signal: number[];
  hist: number[];
} {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const line = closes.map((_, i) =>
    Number.isNaN(ema12[i]) || Number.isNaN(ema26[i])
      ? Number.NaN
      : ema12[i] - ema26[i],
  );
  const lineForEMA = line.map((v) => (Number.isNaN(v) ? 0 : v));
  const signal = calcEMA(lineForEMA, 9);
  const hist = line.map((l, i) =>
    Number.isNaN(l) ? Number.NaN : l - signal[i],
  );
  return { line, signal, hist };
}

// ─── ATR ─────────────────────────────────────────────────────
function calcATR(candles: Candle[], period = 14): number[] {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prev = candles[i - 1].close;
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prev),
      Math.abs(c.low - prev),
    );
  });
  return calcEMA(tr, period);
}

// ─── VWAP ────────────────────────────────────────────────────
function calcVWAP(candles: Candle[]): number[] {
  let cumPV = 0;
  let cumV = 0;
  return candles.map((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumV += c.volume;
    return cumPV / cumV;
  });
}

// ─── Compute All Indicators ───────────────────────────────────
export function computeIndicators(candles: Candle[]): Indicators {
  const closes = candles.map((c) => c.close);
  const macd = calcMACD(closes);
  return {
    rsi: calcRSI(closes, 14),
    macdLine: macd.line,
    macdSignal: macd.signal,
    macdHist: macd.hist,
    ema20: calcEMA(closes, 20),
    ema50: calcEMA(closes, 50),
    ema200: calcEMA(closes, 200),
    vwap: calcVWAP(candles),
    atr: calcATR(candles, 14),
  };
}

// ─── Order Blocks ────────────────────────────────────────────
function findOrderBlocks(candles: Candle[]): OrderBlock[] {
  const blocks: OrderBlock[] = [];
  const n = candles.length;
  for (let i = 3; i < n - 4; i++) {
    const c = candles[i];
    const next3 = candles.slice(i + 1, i + 4);
    if (c.close < c.open) {
      // Potential bullish OB (bearish candle before bullish impulse)
      const bullish = next3.filter((x) => x.close > x.open).length >= 2;
      const impulse = next3[2].close > c.high * 1.002;
      if (bullish && impulse)
        blocks.push({ type: "bullish", high: c.high, low: c.low, index: i });
    } else if (c.close > c.open) {
      // Potential bearish OB (bullish candle before bearish impulse)
      const bearish = next3.filter((x) => x.close < x.open).length >= 2;
      const impulse = next3[2].close < c.low * 0.998;
      if (bearish && impulse)
        blocks.push({ type: "bearish", high: c.high, low: c.low, index: i });
    }
  }
  return blocks.slice(-6);
}

// ─── BOS / CHoCH ─────────────────────────────────────────────
function detectBOS(
  candles: Candle[],
): { type: "bullish" | "bearish"; level: number } | null {
  const n = candles.length;
  if (n < 25) return null;
  const window = candles.slice(-25, -3);
  const swingHigh = Math.max(...window.map((c) => c.high));
  const swingLow = Math.min(...window.map((c) => c.low));
  const last = candles[n - 1];
  if (last.close > swingHigh) return { type: "bullish", level: swingHigh };
  if (last.close < swingLow) return { type: "bearish", level: swingLow };
  return null;
}

// ─── Liquidity Zones ─────────────────────────────────────────
function findLiquidityZones(candles: Candle[]): LiquidityZone[] {
  const n = candles.length;
  const current = candles[n - 1].close;
  const zones: LiquidityZone[] = [];

  // Equal highs (within 0.1%)
  const highs = candles.slice(-50).map((c) => c.high);
  for (let i = 0; i < highs.length - 1; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      if (Math.abs(highs[i] - highs[j]) / highs[i] < 0.001) {
        zones.push({ type: "high", level: (highs[i] + highs[j]) / 2 });
        break;
      }
    }
  }
  // Equal lows
  const lows = candles.slice(-50).map((c) => c.low);
  for (let i = 0; i < lows.length - 1; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      if (Math.abs(lows[i] - lows[j]) / lows[i] < 0.001) {
        zones.push({ type: "low", level: (lows[i] + lows[j]) / 2 });
        break;
      }
    }
  }
  // Filter near current price
  return zones
    .filter((z) => Math.abs(z.level - current) / current < 0.01)
    .slice(0, 6);
}

// ─── SMC Analysis ────────────────────────────────────────────
export function detectSMC(candles: Candle[]): SMCAnalysis {
  const bos = detectBOS(candles);
  const prevBos = candles.length > 50 ? detectBOS(candles.slice(0, -10)) : null;
  const choch =
    bos && prevBos && bos.type !== prevBos.type
      ? { type: bos.type, level: bos.level }
      : null;
  return {
    orderBlocks: findOrderBlocks(candles),
    bos,
    choch,
    liquidityZones: findLiquidityZones(candles),
  };
}

// ─── FVG Detection ───────────────────────────────────────────
function detectFVGs(candles: Candle[]): FVG[] {
  const fvgs: FVG[] = [];
  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2];
    const c2 = candles[i];
    if (c2.low > c0.high) {
      fvgs.push({ type: "bullish", high: c2.low, low: c0.high, index: i });
    } else if (c2.high < c0.low) {
      fvgs.push({ type: "bearish", high: c0.low, low: c2.high, index: i });
    }
  }
  return fvgs.slice(-8);
}

// ─── Kill Zone ───────────────────────────────────────────────
function getCurrentKillZone(): { name: string; active: boolean } {
  const hour = new Date().getUTCHours();
  if (hour >= 2 && hour < 5) return { name: "London", active: true };
  if (hour >= 7 && hour < 10) return { name: "New York", active: true };
  if (hour >= 20 && hour < 23) return { name: "Asian", active: true };
  return { name: "Off-Hours", active: false };
}

// ─── OTE ─────────────────────────────────────────────────────
function calcOTE(candles: Candle[]): { level: number; inZone: boolean } | null {
  const n = candles.length;
  if (n < 50) return null;
  const recent = candles.slice(-50);
  const highest = Math.max(...recent.map((c) => c.high));
  const lowest = Math.min(...recent.map((c) => c.low));
  const range = highest - lowest;
  if (range === 0) return null;
  const ote618 = highest - range * 0.618;
  const ote79 = highest - range * 0.79;
  const current = candles[n - 1].close;
  return {
    level: (ote618 + ote79) / 2,
    inZone:
      current >= Math.min(ote618, ote79) && current <= Math.max(ote618, ote79),
  };
}

// ─── ICT Analysis ────────────────────────────────────────────
export function detectICT(candles: Candle[]): ICTAnalysis {
  return {
    fvgs: detectFVGs(candles),
    killZone: getCurrentKillZone(),
    ote: calcOTE(candles),
  };
}

// ─── Support & Resistance ────────────────────────────────────
export function findSR(candles: Candle[]): SRLevels {
  const lookback = 15;
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const slice = candles.slice(i - lookback, i + lookback + 1);
    const h = candles[i].high;
    const l = candles[i].low;
    if (h === Math.max(...slice.map((c) => c.high))) swingHighs.push(h);
    if (l === Math.min(...slice.map((c) => c.low))) swingLows.push(l);
  }

  const cluster = (levels: number[]) => {
    const sorted = [...levels].sort((a, b) => a - b);
    const clusters: number[] = [];
    let acc = sorted[0];
    let cnt = 1;
    for (let i = 1; i < sorted.length; i++) {
      if ((sorted[i] - acc) / acc < 0.002) {
        acc = (acc * cnt + sorted[i]) / (cnt + 1);
        cnt++;
      } else {
        clusters.push(acc);
        acc = sorted[i];
        cnt = 1;
      }
    }
    if (acc !== undefined) clusters.push(acc);
    return clusters;
  };

  return {
    supports: cluster(swingLows).slice(-6),
    resistances: cluster(swingHighs).slice(-6),
  };
}

// ─── News Filter ─────────────────────────────────────────────
function isNewsTime(): boolean {
  const now = new Date();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const mins = h * 60 + m;
  // Simulate high-impact events: NFP (Fri 12:30), FOMC (Wed 18:00), CPI (Tue 12:30)
  const events = [750, 1080]; // 12:30 UTC, 18:00 UTC
  return events.some((e) => Math.abs(mins - e) <= 30);
}

// ─── Confluence Engine ───────────────────────────────────────
interface StrategyFilter {
  useSMC: boolean;
  useICT: boolean;
  useIndicators: boolean;
  useVolume: boolean;
  useSR: boolean;
}

const STRATEGY_FILTERS: Record<string, StrategyFilter> = {
  "SMC-Only": {
    useSMC: true,
    useICT: false,
    useIndicators: false,
    useVolume: true,
    useSR: false,
  },
  "ICT-Only": {
    useSMC: false,
    useICT: true,
    useIndicators: false,
    useVolume: false,
    useSR: false,
  },
  "Indicators-Only": {
    useSMC: false,
    useICT: false,
    useIndicators: true,
    useVolume: true,
    useSR: true,
  },
  "Full-Confluence": {
    useSMC: true,
    useICT: true,
    useIndicators: true,
    useVolume: true,
    useSR: true,
  },
};

function scoreConfluence(
  candles: Candle[],
  indicators: Indicators,
  filter: StrategyFilter,
): {
  score: number;
  direction: "BUY" | "SELL";
  tags: string[];
  reasoning: string[];
} {
  const n = candles.length;
  if (n < 5) return { score: 0, direction: "BUY", tags: [], reasoning: [] };
  const last = candles[n - 1];
  const current = last.close;

  let buyScore = 0;
  let sellScore = 0;
  const tags: string[] = [];
  const reasoning: string[] = [];

  // ── Indicator signals ─────────────────────
  if (filter.useIndicators) {
    const rsi = indicators.rsi[n - 1];
    if (!Number.isNaN(rsi)) {
      if (rsi < 30) {
        buyScore += 15;
        tags.push("RSI Oversold");
        reasoning.push(
          `RSI(14) at ${rsi.toFixed(1)} — deeply oversold, mean-reversion setup`,
        );
      } else if (rsi > 70) {
        sellScore += 15;
        tags.push("RSI Overbought");
        reasoning.push(
          `RSI(14) at ${rsi.toFixed(1)} — overbought exhaustion signals sellers`,
        );
      } else if (rsi > 50 && rsi <= 65) {
        buyScore += 5;
      } else if (rsi < 50 && rsi >= 35) {
        sellScore += 5;
      }
    }

    const ml = indicators.macdLine[n - 1];
    const ms = indicators.macdSignal[n - 1];
    const mlP = indicators.macdLine[n - 2];
    const msP = indicators.macdSignal[n - 2];
    if (
      !Number.isNaN(ml) &&
      !Number.isNaN(mlP) &&
      !Number.isNaN(ms) &&
      !Number.isNaN(msP)
    ) {
      if (ml > ms && mlP <= msP) {
        buyScore += 10;
        tags.push("MACD Bullish Cross");
        reasoning.push(
          "MACD crossed above signal line — bullish momentum shift confirmed",
        );
      } else if (ml < ms && mlP >= msP) {
        sellScore += 10;
        tags.push("MACD Bearish Cross");
        reasoning.push(
          "MACD crossed below signal line — bearish momentum dominates",
        );
      } else if (ml > ms) {
        buyScore += 4;
      } else {
        sellScore += 4;
      }
    }

    const e20 = indicators.ema20[n - 1];
    const e50 = indicators.ema50[n - 1];
    const e200 = indicators.ema200[n - 1];
    if (!Number.isNaN(e20) && !Number.isNaN(e50)) {
      if (!Number.isNaN(e200)) {
        if (e20 > e50 && e50 > e200 && current > e20) {
          buyScore += 15;
          tags.push("EMA Bull Stack");
          reasoning.push(
            `EMA alignment: 20>${e50.toFixed(0)}>200 with price above — strong uptrend`,
          );
        } else if (e20 < e50 && e50 < e200 && current < e20) {
          sellScore += 15;
          tags.push("EMA Bear Stack");
          reasoning.push(
            `EMA alignment: 20<${e50.toFixed(0)}<200 with price below — strong downtrend`,
          );
        }
      } else {
        if (current > e20 && e20 > e50) {
          buyScore += 8;
          tags.push("EMA Bullish");
          reasoning.push("Price above EMA20 and EMA50 — trend bias bullish");
        } else if (current < e20 && e20 < e50) {
          sellScore += 8;
          tags.push("EMA Bearish");
          reasoning.push("Price below EMA20 and EMA50 — trend bias bearish");
        }
      }
    }
  }

  // ── ICT signals ───────────────────────────
  if (filter.useICT) {
    const kz = getCurrentKillZone();
    if (kz.active) {
      buyScore += 5;
      sellScore += 5;
      tags.push(`${kz.name} Kill Zone`);
      reasoning.push(
        `Active ${kz.name} Kill Zone — institutional order flow expected`,
      );
    }

    const fvgs = detectFVGs(candles);
    const recentFVG = fvgs.find(
      (f) =>
        f.index >= n - 15 &&
        ((f.type === "bullish" &&
          current <= f.high * 1.001 &&
          current >= f.low * 0.999) ||
          (f.type === "bearish" &&
            current >= f.low * 0.999 &&
            current <= f.high * 1.001)),
    );
    if (recentFVG) {
      if (recentFVG.type === "bullish") {
        buyScore += 12;
        tags.push("Bullish FVG");
        reasoning.push(
          `Price reacting within bullish Fair Value Gap ($${recentFVG.low.toFixed(2)}–$${recentFVG.high.toFixed(2)})`,
        );
      } else {
        sellScore += 12;
        tags.push("Bearish FVG");
        reasoning.push(
          `Price inside bearish Fair Value Gap ($${recentFVG.low.toFixed(2)}–$${recentFVG.high.toFixed(2)}) — supply zone`,
        );
      }
    }

    const ote = calcOTE(candles);
    if (ote?.inZone) {
      buyScore += 10;
      tags.push("OTE Zone");
      reasoning.push(
        `Price at Optimal Trade Entry level ($${ote.level.toFixed(2)}) — 61.8–79% Fib retracement`,
      );
    }
  }

  // ── SMC signals ───────────────────────────
  if (filter.useSMC) {
    const obs = findOrderBlocks(candles);
    const nearOB = obs.find(
      (ob) => current >= ob.low * 0.998 && current <= ob.high * 1.002,
    );
    if (nearOB) {
      if (nearOB.type === "bullish") {
        buyScore += 15;
        tags.push("Bullish OB");
        reasoning.push(
          `Price tapping bullish Order Block ($${nearOB.low.toFixed(2)}–$${nearOB.high.toFixed(2)}) — institutional buy zone`,
        );
      } else {
        sellScore += 15;
        tags.push("Bearish OB");
        reasoning.push(
          `Price entering bearish Order Block ($${nearOB.low.toFixed(2)}–$${nearOB.high.toFixed(2)}) — institutional supply`,
        );
      }
    }

    const bos = detectBOS(candles);
    if (bos) {
      if (bos.type === "bullish") {
        buyScore += 10;
        tags.push("Bullish BOS");
        reasoning.push(
          `Break of Structure confirmed above $${bos.level.toFixed(2)} — bullish market structure`,
        );
      } else {
        sellScore += 10;
        tags.push("Bearish BOS");
        reasoning.push(
          `Break of Structure confirmed below $${bos.level.toFixed(2)} — bearish market structure shift`,
        );
      }
    }

    const lzs = findLiquidityZones(candles);
    if (lzs.length > 0) {
      const nearHigh = lzs.find(
        (z) =>
          z.type === "high" && Math.abs(current - z.level) / current < 0.003,
      );
      const nearLow = lzs.find(
        (z) =>
          z.type === "low" && Math.abs(current - z.level) / current < 0.003,
      );
      if (nearHigh) {
        sellScore += 8;
        tags.push("Liquidity Grab");
        reasoning.push(
          `Equal highs at $${nearHigh.level.toFixed(2)} — stop hunt target for sellers`,
        );
      }
      if (nearLow) {
        buyScore += 8;
        tags.push("Liquidity Sweep");
        reasoning.push(
          `Equal lows at $${nearLow.level.toFixed(2)} — liquidity sweep complete, reversal likely`,
        );
      }
    }
  }

  // ── Volume ────────────────────────────────
  if (filter.useVolume) {
    const recentVols = candles.slice(-20).map((c) => c.volume);
    const avgVol = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
    if (last.volume > avgVol * 1.5) {
      const isGreen = last.close > last.open;
      if (isGreen) buyScore += 7;
      else sellScore += 7;
      tags.push("High Volume");
      reasoning.push(
        `Volume ${(last.volume / avgVol).toFixed(1)}x above 20-period average — strong conviction move`,
      );
    }
  }

  // ── Support & Resistance ──────────────────
  if (filter.useSR) {
    const sr = findSR(candles);
    const nearSupport = sr.supports.some(
      (s) => Math.abs(current - s) / current < 0.003,
    );
    const nearResistance = sr.resistances.some(
      (r) => Math.abs(current - r) / current < 0.003,
    );
    if (nearSupport) {
      buyScore += 10;
      tags.push("Key Support");
      reasoning.push(
        "Price testing major support level — high-probability bounce zone",
      );
    }
    if (nearResistance) {
      sellScore += 10;
      tags.push("Key Resistance");
      reasoning.push(
        "Price approaching key resistance — potential distribution zone",
      );
    }
  }

  const direction: "BUY" | "SELL" = buyScore >= sellScore ? "BUY" : "SELL";
  const rawScore = Math.max(buyScore, sellScore);
  // Normalize: max theoretical ~110 → scale to 100
  const score = Math.min(100, Math.max(0, Math.round((rawScore / 90) * 100)));
  return { score, direction, tags, reasoning };
}

// ─── Signal Generation ───────────────────────────────────────
export function generateSignal(
  timeframe: string,
  strategy = "Full-Confluence",
): SignalResult | null {
  if (isNewsTime()) return null;

  const candles = generateCandles(timeframe, 300);
  const indicators = computeIndicators(candles);
  const filter =
    STRATEGY_FILTERS[strategy] ?? STRATEGY_FILTERS["Full-Confluence"];
  const { score, direction, tags, reasoning } = scoreConfluence(
    candles,
    indicators,
    filter,
  );

  if (score < 65) return null;

  const n = candles.length;
  const current = candles[n - 1].close;
  const atr = indicators.atr[n - 1];
  const safeATR = !Number.isNaN(atr) && atr > 0 ? atr : current * 0.003;

  const tradeType: "Scalp" | "Intraday" | "Swing" = ["1m", "5m"].includes(
    timeframe,
  )
    ? "Scalp"
    : ["15m", "1H"].includes(timeframe)
      ? "Intraday"
      : "Swing";

  const atrMult =
    tradeType === "Scalp" ? 1.5 : tradeType === "Intraday" ? 2.0 : 2.5;
  const slDist = safeATR * atrMult;

  const entry = current;
  const sl = direction === "BUY" ? entry - slDist : entry + slDist;
  const tp1 = direction === "BUY" ? entry + slDist * 1.5 : entry - slDist * 1.5;
  const tp2 = direction === "BUY" ? entry + slDist * 2.5 : entry - slDist * 2.5;
  const tp3 = direction === "BUY" ? entry + slDist * 4.0 : entry - slDist * 4.0;

  const aiReasoning = `${reasoning.join(". ")}. Confluence score ${score}/100. ATR(14)=$${safeATR.toFixed(2)}, SL at ${atrMult}x ATR.`;

  return {
    direction,
    entry: +entry.toFixed(2),
    sl: +sl.toFixed(2),
    tp1: +tp1.toFixed(2),
    tp2: +tp2.toFixed(2),
    tp3: +tp3.toFixed(2),
    rrRatio: 1.5,
    confidence: score,
    tradeType,
    reasoning: aiReasoning,
    tags,
  };
}

// ─── Backtest Engine ─────────────────────────────────────────
export function runBacktest(
  strategy: string,
  candles: Candle[],
): BacktestStats {
  const filter =
    STRATEGY_FILTERS[strategy] ?? STRATEGY_FILTERS["Full-Confluence"];
  const trades: BacktestTrade[] = [];
  const STEP = 20;
  const HORIZON = 30;

  for (let i = 100; i < candles.length - HORIZON; i += STEP) {
    const slice = candles.slice(0, i + 1);
    const ind = computeIndicators(slice);
    const { score, direction } = scoreConfluence(slice, ind, filter);
    if (score < 65) continue;

    const entry = slice[slice.length - 1].close;
    const atr = ind.atr[slice.length - 1];
    const safeATR = !Number.isNaN(atr) && atr > 0 ? atr : entry * 0.003;
    const slDist = safeATR * 2.0;
    const sl = direction === "BUY" ? entry - slDist : entry + slDist;
    const tp =
      direction === "BUY" ? entry + slDist * 1.5 : entry - slDist * 1.5;

    let outcome: "WIN" | "LOSS" | "BREAKEVEN" = "BREAKEVEN";
    let exitPrice = entry;

    for (let j = i + 1; j <= i + HORIZON; j++) {
      const c = candles[j];
      if (direction === "BUY") {
        if (c.high >= tp) {
          outcome = "WIN";
          exitPrice = tp;
          break;
        }
        if (c.low <= sl) {
          outcome = "LOSS";
          exitPrice = sl;
          break;
        }
      } else {
        if (c.low <= tp) {
          outcome = "WIN";
          exitPrice = tp;
          break;
        }
        if (c.high >= sl) {
          outcome = "LOSS";
          exitPrice = sl;
          break;
        }
      }
    }
    if (outcome === "BREAKEVEN") exitPrice = candles[i + HORIZON].close;

    const pnlPips =
      direction === "BUY" ? (exitPrice - entry) * 10 : (entry - exitPrice) * 10;

    trades.push({
      entryPrice: entry,
      exitPrice,
      direction,
      outcome,
      pnlPips,
      confidence: score,
    });
  }

  if (trades.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      trades: [],
      equityCurve: [0],
    };
  }

  const wins = trades.filter((t) => t.outcome === "WIN").length;
  const losses = trades.filter((t) => t.outcome === "LOSS").length;
  const winRate = wins / trades.length;

  const grossProfit = trades
    .filter((t) => t.pnlPips > 0)
    .reduce((a, b) => a + b.pnlPips, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.pnlPips < 0).reduce((a, b) => a + b.pnlPips, 0),
  );
  const profitFactor =
    grossLoss === 0
      ? grossProfit > 0
        ? 9.99
        : 0
      : +(grossProfit / grossLoss).toFixed(2);

  // Equity curve & max drawdown
  const equityCurve: number[] = [0];
  let equity = 0;
  let peak = 0;
  let maxDD = 0;
  for (const t of trades) {
    equity += t.pnlPips;
    equityCurve.push(+equity.toFixed(1));
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  }

  const returns = trades.map((t) => t.pnlPips);
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(
    returns.map((r) => (r - meanReturn) ** 2).reduce((a, b) => a + b, 0) /
      returns.length,
  );
  const sharpeRatio =
    stdReturn === 0
      ? 0
      : +((meanReturn / stdReturn) * Math.sqrt(252)).toFixed(2);

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate: +winRate.toFixed(4),
    profitFactor,
    maxDrawdown: +maxDD.toFixed(1),
    sharpeRatio,
    trades,
    equityCurve,
  };
}
