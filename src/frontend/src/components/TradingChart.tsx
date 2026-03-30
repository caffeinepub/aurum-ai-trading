import type {
  Candle,
  ICTAnalysis,
  Indicators,
  SMCAnalysis,
  SignalResult,
} from "@/lib/tradingEngine";
import { useCallback, useEffect, useRef, useState } from "react";

const COLORS = {
  bg: "#0a0b0e",
  surface: "#111318",
  border: "#1e2028",
  grid: "#16181f",
  bull: "#00d4a0",
  bear: "#ff4d6a",
  gold: "#f5c542",
  ema20: "rgba(77,159,255,0.85)",
  ema50: "rgba(245,165,66,0.85)",
  ema200: "rgba(255,77,106,0.6)",
  vwap: "rgba(180,100,255,0.7)",
  text: "#6b7280",
  textBright: "#9ca3af",
  crosshair: "rgba(245,197,66,0.4)",
};

interface Props {
  candles: Candle[];
  indicators: Indicators | null;
  signal?: SignalResult | null;
  smc?: SMCAnalysis | null;
  ict?: ICTAnalysis | null;
  height?: number;
}

interface HoverState {
  x: number;
  y: number;
  candle: Candle;
  idx: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TradingChart({
  candles,
  indicators,
  signal,
  smc,
  ict,
  height = 420,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const hoverRef = useRef<HoverState | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || candles.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = container.clientHeight;
    if (W === 0 || H === 0) return;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Layout
    const PRICE_AXIS_W = 72;
    const TIME_AXIS_H = 26;
    const VOL_H = Math.floor(H * 0.16);
    const VOL_GAP = 4;
    const CHART_H = H - TIME_AXIS_H - VOL_H - VOL_GAP;
    const CHART_W = W - PRICE_AXIS_W;

    // Candle sizing
    const rawCandleW = CHART_W / candles.length;
    const candleW = Math.max(1.5, rawCandleW - 0.5);
    const startIdx = Math.max(
      0,
      candles.length - Math.floor(CHART_W / rawCandleW),
    );
    const visible = candles.slice(startIdx);
    const indStart = startIdx;

    if (visible.length === 0) return;

    // Price range
    const vHigh = Math.max(...visible.map((c) => c.high));
    const vLow = Math.min(...visible.map((c) => c.low));
    const pad = (vHigh - vLow) * 0.06;
    const pMax = vHigh + pad;
    const pMin = vLow - pad;
    const pRange = pMax - pMin;
    if (pRange === 0) return;

    // Volume range
    const vMax = Math.max(...visible.map((c) => c.volume));

    // Scale helpers
    const toY = (price: number) =>
      CHART_H - ((price - pMin) / pRange) * CHART_H;
    const toX = (i: number) => i * rawCandleW + rawCandleW / 2;
    const toVolH = (vol: number) => (vol / vMax) * VOL_H * 0.9;
    const toVolY = (vol: number) => CHART_H + VOL_GAP + VOL_H - toVolH(vol);

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // Price axis bg
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(CHART_W, 0, PRICE_AXIS_W, H);

    // Grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let gi = 1; gi <= 5; gi++) {
      const y = (CHART_H / 6) * gi;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CHART_W, y);
      ctx.stroke();
    }

    // Signal zone fills
    if (signal) {
      const entY = toY(signal.entry);
      const slY = toY(signal.sl);
      const tp1Y = toY(signal.tp1);
      // SL zone
      ctx.fillStyle = "rgba(255,77,106,0.06)";
      const szTop = signal.direction === "BUY" ? slY : entY;
      const szBot = signal.direction === "BUY" ? entY : slY;
      ctx.fillRect(0, szTop, CHART_W, szBot - szTop);
      // TP zone
      ctx.fillStyle = "rgba(0,212,160,0.06)";
      const tzTop = signal.direction === "BUY" ? entY : tp1Y;
      const tzBot = signal.direction === "BUY" ? tp1Y : entY;
      ctx.fillRect(0, tzTop, CHART_W, Math.abs(tzBot - tzTop));
    }

    // Order Blocks
    if (smc) {
      for (const ob of smc.orderBlocks) {
        if (ob.index < indStart) continue;
        const obX = (ob.index - indStart) * rawCandleW;
        const obWidth = (visible.length - (ob.index - indStart)) * rawCandleW;
        const obTop = toY(ob.high);
        const obBot = toY(ob.low);
        ctx.fillStyle =
          ob.type === "bullish"
            ? "rgba(0,212,160,0.08)"
            : "rgba(255,77,106,0.08)";
        ctx.fillRect(obX, obTop, obWidth, obBot - obTop);
        ctx.strokeStyle =
          ob.type === "bullish"
            ? "rgba(0,212,160,0.3)"
            : "rgba(255,77,106,0.3)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(obX, obTop, obWidth, obBot - obTop);
      }
    }

    // FVGs
    if (ict) {
      for (const fvg of ict.fvgs) {
        if (fvg.index < indStart) continue;
        const fvgX = (fvg.index - indStart) * rawCandleW;
        const fvgW = (visible.length - (fvg.index - indStart)) * rawCandleW;
        const fvgTop = toY(fvg.high);
        const fvgBot = toY(fvg.low);
        ctx.fillStyle =
          fvg.type === "bullish"
            ? "rgba(77,159,255,0.1)"
            : "rgba(245,197,66,0.1)";
        ctx.fillRect(fvgX, fvgTop, fvgW, Math.abs(fvgBot - fvgTop));
      }
    }

    // EMA 200
    if (indicators) {
      drawLine(
        ctx,
        indicators.ema200.slice(indStart),
        toX,
        toY,
        CHART_H,
        COLORS.ema200,
        1,
      );
      // EMA 50
      drawLine(
        ctx,
        indicators.ema50.slice(indStart),
        toX,
        toY,
        CHART_H,
        COLORS.ema50,
        1.2,
      );
      // EMA 20
      drawLine(
        ctx,
        indicators.ema20.slice(indStart),
        toX,
        toY,
        CHART_H,
        COLORS.ema20,
        1.4,
      );
      // VWAP
      drawLine(
        ctx,
        indicators.vwap.slice(indStart),
        toX,
        toY,
        CHART_H,
        COLORS.vwap,
        1,
        [4, 3],
      );
    }

    // Volume bars
    visible.forEach((c, i) => {
      const isGreen = c.close >= c.open;
      ctx.fillStyle = isGreen
        ? "rgba(0,212,160,0.25)"
        : "rgba(255,77,106,0.25)";
      const x = toX(i) - Math.max(1, candleW / 2);
      const h = toVolH(c.volume);
      const y = toVolY(c.volume);
      ctx.fillRect(x, y, Math.max(1, candleW - 1), h);
    });

    // Candles
    visible.forEach((c, i) => {
      const x = toX(i);
      const isGreen = c.close >= c.open;
      const color = isGreen ? COLORS.bull : COLORS.bear;

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(c.high));
      ctx.lineTo(x, toY(c.low));
      ctx.stroke();

      // Body
      const bodyTop = toY(Math.max(c.open, c.close));
      const bodyBot = toY(Math.min(c.open, c.close));
      const bodyH = Math.max(1, bodyBot - bodyTop);
      const bodyW = Math.max(2, candleW - 1);
      ctx.fillStyle = color;
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyH);
    });

    // Crosshair
    const hov = hoverRef.current;
    if (hov) {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = COLORS.crosshair;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hov.x, 0);
      ctx.lineTo(hov.x, CHART_H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, hov.y);
      ctx.lineTo(CHART_W, hov.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label on axis
      const price = pMin + ((CHART_H - hov.y) / CHART_H) * pRange;
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(CHART_W, hov.y - 10, PRICE_AXIS_W, 20);
      ctx.fillStyle = COLORS.bg;
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`$${fmt(price)}`, CHART_W + PRICE_AXIS_W / 2, hov.y + 4);
      ctx.textAlign = "left";
    }

    // Signal price lines
    if (signal) {
      drawPriceLine(
        ctx,
        toY(signal.entry),
        CHART_W,
        PRICE_AXIS_W,
        COLORS.gold,
        `ENT $${fmt(signal.entry)}`,
        [6, 3],
      );
      drawPriceLine(
        ctx,
        toY(signal.sl),
        CHART_W,
        PRICE_AXIS_W,
        COLORS.bear,
        `SL  $${fmt(signal.sl)}`,
        [4, 3],
      );
      drawPriceLine(
        ctx,
        toY(signal.tp1),
        CHART_W,
        PRICE_AXIS_W,
        COLORS.bull,
        `TP1 $${fmt(signal.tp1)}`,
        [4, 3],
      );
      if (toY(signal.tp2) > 0 && toY(signal.tp2) < CHART_H) {
        drawPriceLine(
          ctx,
          toY(signal.tp2),
          CHART_W,
          PRICE_AXIS_W,
          "rgba(0,212,160,0.5)",
          `TP2 $${fmt(signal.tp2)}`,
          [2, 4],
        );
      }
    }

    // Current price line
    const lastClose = candles[candles.length - 1].close;
    const lastY = toY(lastClose);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(245,197,66,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, lastY);
    ctx.lineTo(CHART_W, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price axis labels
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.text;
    for (let pi = 0; pi <= 5; pi++) {
      const price = pMax - (pRange * pi) / 5;
      const y = (CHART_H / 5) * pi;
      ctx.fillText(`$${fmt(price)}`, W - 4, y + 4);
      // horizontal label line
      ctx.strokeStyle = "rgba(30,32,40,0.8)";
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(CHART_W, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Current price label on axis
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(CHART_W, lastY - 10, PRICE_AXIS_W, 20);
    ctx.fillStyle = COLORS.bg;
    ctx.font = "bold 11px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`$${fmt(lastClose)}`, W - PRICE_AXIS_W / 2, lastY + 4);
    ctx.textAlign = "left";

    // Time axis
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, H - TIME_AXIS_H, W, TIME_AXIS_H);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, H - TIME_AXIS_H);
    ctx.lineTo(W, H - TIME_AXIS_H);
    ctx.stroke();

    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "center";
    const labelStep = Math.max(10, Math.floor(visible.length / 7));
    for (let ti = 0; ti < visible.length; ti += labelStep) {
      const t = new Date(visible[ti].time * 1000);
      const label = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
      ctx.fillText(label, toX(ti), H - 8);
    }

    // Legend
    const legends = [
      { color: COLORS.ema20, label: "EMA20" },
      { color: COLORS.ema50, label: "EMA50" },
      { color: COLORS.ema200, label: "EMA200" },
      { color: COLORS.vwap, label: "VWAP" },
    ];
    ctx.textAlign = "left";
    ctx.font = "10px Inter, sans-serif";
    legends.forEach((leg, li) => {
      const lx = 8 + li * 68;
      ctx.fillStyle = leg.color;
      ctx.fillRect(lx, 8, 16, 2);
      ctx.fillStyle = COLORS.textBright;
      ctx.fillText(leg.label, lx + 20, 14);
    });
  }, [candles, indicators, signal, smc, ict]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const obs = new ResizeObserver(() => draw());
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || candles.length === 0) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const PRICE_AXIS_W = 72;
      const CHART_W = container.clientWidth - PRICE_AXIS_W;
      if (x > CHART_W) return;

      const rawCandleW = CHART_W / candles.length;
      const startIdx = Math.max(
        0,
        candles.length - Math.floor(CHART_W / rawCandleW),
      );
      const visible = candles.slice(startIdx);
      const idx = Math.min(
        visible.length - 1,
        Math.max(0, Math.floor(x / rawCandleW)),
      );

      hoverRef.current = { x, y, candle: visible[idx], idx };
      setHover({ x, y, candle: visible[idx], idx });
      draw();
    },
    [candles, draw],
  );

  const handleMouseLeave = useCallback(() => {
    hoverRef.current = null;
    setHover(null);
    draw();
  }, [draw]);

  return (
    <div className="relative w-full" style={{ height }} ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {/* OHLCV tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute top-3 left-3 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs font-mono backdrop-blur-sm z-10"
          style={{ minWidth: 200 }}
        >
          <div className="text-muted-foreground mb-1">
            {new Date(hover.candle.time * 1000).toLocaleString()}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-muted-foreground">O</span>
            <span className="text-foreground">${fmt(hover.candle.open)}</span>
            <span className="text-muted-foreground">H</span>
            <span className="text-bull">${fmt(hover.candle.high)}</span>
            <span className="text-muted-foreground">L</span>
            <span className="text-destructive">${fmt(hover.candle.low)}</span>
            <span className="text-muted-foreground">C</span>
            <span
              className={
                hover.candle.close >= hover.candle.open
                  ? "text-bull"
                  : "text-destructive"
              }
            >
              ${fmt(hover.candle.close)}
            </span>
            <span className="text-muted-foreground">Vol</span>
            <span className="text-foreground">
              {(hover.candle.volume / 1000).toFixed(0)}K
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// helpers
function drawLine(
  ctx: CanvasRenderingContext2D,
  values: number[],
  toX: (i: number) => number,
  toY: (p: number) => number,
  maxY: number,
  color: string,
  width: number,
  dash: number[] = [],
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (Number.isNaN(v)) continue;
    const y = toY(v);
    if (y < 0 || y > maxY) {
      started = false;
      continue;
    }
    if (!started) {
      ctx.moveTo(toX(i), y);
      started = true;
    } else ctx.lineTo(toX(i), y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPriceLine(
  ctx: CanvasRenderingContext2D,
  y: number,
  chartW: number,
  axisW: number,
  color: string,
  label: string,
  dash: number[],
) {
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(chartW, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // label on axis
  ctx.fillStyle = color;
  ctx.fillRect(chartW, y - 9, axisW, 18);
  ctx.fillStyle = "#0a0b0e";
  ctx.font = "bold 9px JetBrains Mono, monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, chartW + axisW / 2, y + 4);
  ctx.textAlign = "left";
}
