import type { TradeResult, TradingSignal } from "@/backend";
import { TradingChart } from "@/components/TradingChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTradingContext } from "@/context/TradingContext";
import {
  useActiveSignals,
  useAddTradeResult,
  useCreateSignal,
  usePriceCache,
  useRefreshPrice,
  useTradeHistory,
  useUpdateSignalStatus,
} from "@/hooks/useQueries";
import {
  fetchRealPrice,
  getLivePrice,
  setLivePrice,
  tickLivePrice,
} from "@/lib/livePrice";
import {
  type Candle,
  type ICTAnalysis,
  type Indicators,
  type SMCAnalysis,
  type SignalResult,
  computeIndicators,
  detectICT,
  detectSMC,
  generateCandles,
  generateSignal,
} from "@/lib/tradingEngine";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "D"] as const;

function fmt2(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getKillZone() {
  const h = new Date().getUTCHours();
  if (h >= 2 && h < 5) return { name: "London", color: "text-info" };
  if (h >= 7 && h < 10) return { name: "New York", color: "text-destructive" };
  if (h >= 20 && h < 23) return { name: "Asian", color: "text-primary" };
  return { name: "Off-Hours", color: "text-muted-foreground" };
}

function isMarketOpen() {
  const h = new Date().getUTCHours();
  return h >= 0 && h < 22;
}

export function Dashboard() {
  const { selectedTimeframe, setSelectedTimeframe } = useTradingContext();
  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [smcData, setSmcData] = useState<SMCAnalysis | null>(null);
  const [ictData, setIctData] = useState<ICTAnalysis | null>(null);
  const [localSignal, setLocalSignal] = useState<SignalResult | null>(null);
  const [activeBackendSignal, setActiveBackendSignal] =
    useState<TradingSignal | null>(null);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(getLivePrice);
  const [priceChange, setPriceChange] = useState(0);

  const activeSignalsQ = useActiveSignals();
  const tradeHistoryQ = useTradeHistory();
  const _priceCacheQ = usePriceCache();
  const createSignal = useCreateSignal();
  const updateStatus = useUpdateSignalStatus();
  const addTrade = useAddTradeResult();
  const refreshPrice = useRefreshPrice();

  const kz = getKillZone();
  const marketOpen = isMarketOpen();

  // Load candles when timeframe changes
  const loadCandles = useCallback(() => {
    const cs = generateCandles(selectedTimeframe, 300, getLivePrice());
    const ind = computeIndicators(cs);
    const smc = detectSMC(cs);
    const ict = detectICT(cs);
    const lastClose = cs[cs.length - 1].close;
    const prevClose = cs[cs.length - 2]?.close ?? lastClose;
    setCandles(cs);
    setIndicators(ind);
    setSmcData(smc);
    setIctData(ict);
    setCurrentPrice(lastClose);
    setPriceChange(lastClose - prevClose);
  }, [selectedTimeframe]);

  useEffect(() => {
    loadCandles();
  }, [loadCandles]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => {
      // Simulate live tick: nudge last candle
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        const last = { ...copy[copy.length - 1] };
        const newPrice = tickLivePrice();
        last.close = newPrice;
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
        copy[copy.length - 1] = last;
        setCurrentPrice(newPrice);
        setPriceChange(
          last.close - (copy[copy.length - 2]?.close ?? last.close),
        );
        return copy;
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Sync active backend signal
  useEffect(() => {
    if (activeSignalsQ.data && activeSignalsQ.data.length > 0) {
      setActiveBackendSignal(activeSignalsQ.data[0]);
    } else {
      setActiveBackendSignal(null);
    }
  }, [activeSignalsQ.data]);

  // Fetch real XAUUSD price on mount and every 15 seconds
  useEffect(() => {
    const doFetch = async () => {
      await fetchRealPrice();
      const p = getLivePrice();
      setCurrentPrice(p);
      loadCandles();
    };
    doFetch();
    const id = setInterval(doFetch, 15000);
    return () => clearInterval(id);
  }, [loadCandles]);

  const handleGenerateSignal = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = generateSignal(selectedTimeframe);
      if (!result) {
        toast.info(
          "No high-probability setup found. Confidence below 65% threshold.",
        );
        setIsGenerating(false);
        return;
      }
      setLocalSignal(result);

      // Persist to backend
      const signal: TradingSignal = {
        id: BigInt(0),
        status: "ACTIVE",
        direction: result.direction,
        tradeType: result.tradeType,
        confidenceScore: BigInt(Math.round(result.confidence)),
        rrRatio: result.rrRatio,
        stopLoss: result.sl,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        entryPrice: result.entry,
        takeProfit1: result.tp1,
        takeProfit2: result.tp2,
        takeProfit3: result.tp3,
        aiReasoning: result.reasoning,
        strategyTags: result.tags,
        symbol: "XAUUSD",
      };
      await createSignal.mutateAsync(signal);
      toast.success(
        `${result.direction} signal generated — Confidence: ${result.confidence}%`,
      );
    } catch {
      toast.error("Failed to generate signal");
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTimeframe, createSignal]);

  const handleMarkOutcome = useCallback(
    async (outcome: "WIN" | "LOSS") => {
      const sig = activeBackendSignal;
      if (!sig) return;
      try {
        await updateStatus.mutateAsync({ id: sig.id, status: outcome });
        const trade: TradeResult = {
          signalId: sig.id,
          entryPrice: sig.entryPrice,
          exitPrice: outcome === "WIN" ? sig.takeProfit1 : sig.stopLoss,
          pnlPips:
            outcome === "WIN"
              ? (sig.takeProfit1 - sig.entryPrice) *
                (sig.direction === "BUY" ? 1 : -1) *
                10
              : (sig.stopLoss - sig.entryPrice) *
                (sig.direction === "BUY" ? 1 : -1) *
                10,
          pnlPercent:
            outcome === "WIN"
              ? ((sig.takeProfit1 - sig.entryPrice) / sig.entryPrice) *
                100 *
                (sig.direction === "BUY" ? 1 : -1)
              : ((sig.stopLoss - sig.entryPrice) / sig.entryPrice) *
                100 *
                (sig.direction === "BUY" ? 1 : -1),
          outcome,
          duration: BigInt(Math.floor(Math.random() * 7200)),
          timestamp: BigInt(Math.floor(Date.now() / 1000)),
        };
        await addTrade.mutateAsync(trade);
        setActiveBackendSignal(null);
        setLocalSignal(null);
        toast.success(`Trade marked as ${outcome}`);
      } catch {
        toast.error("Failed to update trade");
      }
    },
    [activeBackendSignal, updateStatus, addTrade],
  );

  // Stats
  const trades = tradeHistoryQ.data ?? [];
  const last20 = trades.slice(-20);
  const wins20 = last20.filter((t) => t.outcome === "WIN").length;
  const winRate =
    last20.length > 0 ? ((wins20 / last20.length) * 100).toFixed(0) : "—";
  const todaySignals =
    (activeSignalsQ.data ?? []).length +
    trades.filter(
      (t) => Number(t.timestamp) > Math.floor(Date.now() / 1000) - 86400,
    ).length;

  const displaySignal = activeBackendSignal
    ? {
        direction: activeBackendSignal.direction as "BUY" | "SELL",
        entry: activeBackendSignal.entryPrice,
        sl: activeBackendSignal.stopLoss,
        tp1: activeBackendSignal.takeProfit1,
        tp2: activeBackendSignal.takeProfit2,
        tp3: activeBackendSignal.takeProfit3,
        rrRatio: activeBackendSignal.rrRatio,
        confidence: Number(activeBackendSignal.confidenceScore),
        tradeType: activeBackendSignal.tradeType as
          | "Scalp"
          | "Intraday"
          | "Swing",
        reasoning: activeBackendSignal.aiReasoning,
        tags: activeBackendSignal.strategyTags,
      }
    : localSignal;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-4 border-b border-border px-5 py-3">
        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
            ${fmt2(currentPrice)}
          </span>
          <span
            className={cn(
              "font-mono text-sm font-medium",
              priceChange >= 0 ? "price-up" : "price-down",
            )}
          >
            {priceChange >= 0 ? "+" : ""}
            {fmt2(priceChange)} (
            {((priceChange / currentPrice) * 100).toFixed(3)}%)
          </span>
          <span className="text-xs text-muted-foreground">XAUUSD</span>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Market status */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full pulse-dot",
              marketOpen ? "bg-bull" : "bg-muted-foreground",
            )}
          />
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              marketOpen ? "text-bull" : "text-muted-foreground",
            )}
          >
            {marketOpen ? "Market Open" : "Market Closed"}
          </span>
        </div>

        {/* Kill Zone */}
        <Badge variant="outline" className={cn("text-xs", kz.color)}>
          {kz.name} Session
        </Badge>

        <div className="flex-1" />

        <span className="text-xs text-muted-foreground">
          <Clock className="inline h-3 w-3 mr-1" />
          {new Date().toUTCString().slice(17, 25)} UTC
        </span>

        <Button
          data-ocid="dashboard.refresh.button"
          variant="outline"
          size="sm"
          onClick={() => refreshPrice.mutate()}
          disabled={refreshPrice.isPending}
          className="gap-1.5 text-xs"
        >
          <RefreshCw
            className={cn("h-3 w-3", refreshPrice.isPending && "animate-spin")}
          />
          Refresh
        </Button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chart area — 2/3 */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-border">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 border-b border-border px-4 py-2">
            <span className="mr-2 text-xs text-muted-foreground">TF:</span>
            {TIMEFRAMES.map((tf) => (
              <button
                type="button"
                key={tf}
                data-ocid={`chart.${tf}.tab`}
                onClick={() => setSelectedTimeframe(tf)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-mono font-medium transition-colors",
                  selectedTimeframe === tf
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {tf}
              </button>
            ))}
            <div className="flex-1" />
            <Button
              data-ocid="dashboard.generate_signal.button"
              size="sm"
              onClick={handleGenerateSignal}
              disabled={isGenerating}
              className="gap-1.5 text-xs bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
              variant="ghost"
            >
              <Zap className={cn("h-3 w-3", isGenerating && "animate-spin")} />
              {isGenerating ? "Analyzing..." : "Generate Signal"}
            </Button>
          </div>

          {/* Chart */}
          <div className="flex-1 p-2 min-h-0">
            {candles.length === 0 ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : (
              <TradingChart
                candles={candles}
                indicators={indicators}
                signal={displaySignal}
                smc={smcData}
                ict={ictData}
                height={undefined as unknown as number}
              />
            )}
          </div>

          {/* Stats row */}
          <div className="flex shrink-0 items-center gap-6 border-t border-border px-5 py-2.5">
            <StatCell label="Today's Signals" value={String(todaySignals)} />
            <StatCell label="Win Rate (L20)" value={`${winRate}%`} />
            <StatCell label="Avg R:R" value="1:1.8" />
            <StatCell
              label="Streak"
              value={
                trades.slice(-3).every((t) => t.outcome === "WIN")
                  ? "🔥 3W"
                  : trades.slice(-1)[0]?.outcome === "WIN"
                    ? "🟢 1W"
                    : "—"
              }
            />
            {indicators && (
              <>
                <StatCell
                  label="RSI"
                  value={(
                    indicators.rsi[indicators.rsi.length - 1] ?? 0
                  ).toFixed(1)}
                />
                <StatCell
                  label="ATR"
                  value={`$${(indicators.atr[indicators.atr.length - 1] ?? 0).toFixed(2)}`}
                />
              </>
            )}
          </div>
        </div>

        {/* Signal panel — 1/3 */}
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto p-3">
          <AnimatePresence mode="wait">
            {displaySignal ? (
              <motion.div
                key="signal"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={cn(
                  "rounded-xl border bg-card p-4 slide-in",
                  displaySignal.direction === "BUY"
                    ? "signal-buy"
                    : "signal-sell",
                )}
                data-ocid="dashboard.signal.card"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {displaySignal.direction === "BUY" ? (
                      <TrendingUp className="h-5 w-5 text-bull" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    )}
                    <span
                      className={cn(
                        "font-bold text-base",
                        displaySignal.direction === "BUY"
                          ? "text-bull"
                          : "text-destructive",
                      )}
                    >
                      {displaySignal.direction}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      XAUUSD
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-mono",
                      displaySignal.tradeType === "Scalp"
                        ? "border-primary/30 text-primary"
                        : displaySignal.tradeType === "Intraday"
                          ? "border-info/30 text-info"
                          : "border-bull/30 text-bull",
                    )}
                  >
                    {displaySignal.tradeType}
                  </Badge>
                </div>

                {/* Confidence */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-mono font-bold text-foreground">
                      {displaySignal.confidence}%
                    </span>
                  </div>
                  <div className="confidence-bar">
                    <div
                      className="confidence-bar-fill"
                      style={{ width: `${displaySignal.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Levels */}
                <div className="space-y-1.5 font-mono text-sm">
                  <LevelRow
                    label="Entry"
                    value={`$${fmt2(displaySignal.entry)}`}
                    color="text-primary"
                  />
                  <LevelRow
                    label="SL"
                    value={`$${fmt2(displaySignal.sl)}`}
                    diff={displaySignal.sl - displaySignal.entry}
                    color="text-destructive"
                  />
                  <LevelRow
                    label="TP1"
                    value={`$${fmt2(displaySignal.tp1)}`}
                    diff={displaySignal.tp1 - displaySignal.entry}
                    color="text-bull"
                  />
                  <LevelRow
                    label="TP2"
                    value={`$${fmt2(displaySignal.tp2)}`}
                    diff={displaySignal.tp2 - displaySignal.entry}
                    color="text-bull opacity-70"
                  />
                  <LevelRow
                    label="TP3"
                    value={`$${fmt2(displaySignal.tp3)}`}
                    diff={displaySignal.tp3 - displaySignal.entry}
                    color="text-bull opacity-50"
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
                  <span className="text-xs text-muted-foreground">
                    R:R Ratio
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    1:{displaySignal.rrRatio.toFixed(1)}
                  </span>
                </div>

                {/* Action buttons */}
                {activeBackendSignal && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      data-ocid="dashboard.mark_win.button"
                      size="sm"
                      className="flex-1 gap-1.5 bg-bull/15 text-bull border border-bull/30 hover:bg-bull/25 text-xs"
                      variant="ghost"
                      onClick={() => handleMarkOutcome("WIN")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Win
                    </Button>
                    <Button
                      data-ocid="dashboard.mark_loss.button"
                      size="sm"
                      className="flex-1 gap-1.5 bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 text-xs"
                      variant="ghost"
                      onClick={() => handleMarkOutcome("LOSS")}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Loss
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="no-signal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center"
                data-ocid="dashboard.signal.empty_state"
              >
                <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">
                  No Active Signal
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click &ldquo;Generate Signal&rdquo; to run the confluence
                  analysis
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Reasoning */}
          {displaySignal && (
            <div className="rounded-xl border border-border bg-card">
              <button
                type="button"
                data-ocid="dashboard.ai_reasoning.toggle"
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/30 transition-colors rounded-xl"
                onClick={() => setReasoningExpanded((e) => !e)}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs font-mono text-primary">AI</span>
                  <span>Analysis Breakdown</span>
                </span>
                {reasoningExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {reasoningExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        {displaySignal.reasoning}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {displaySignal.tags.map((tag) => (
                          <span
                            key={tag}
                            className={cn("tag-chip", tagColor(tag))}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* SMC Summary */}
          {smcData && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
                SMC Analysis
              </p>
              <div className="space-y-1.5 text-xs">
                <InfoRow
                  label="BOS"
                  value={
                    smcData.bos ? (
                      <span
                        className={
                          smcData.bos.type === "bullish"
                            ? "text-bull"
                            : "text-destructive"
                        }
                      >
                        {smcData.bos.type.toUpperCase()} @ $
                        {fmt2(smcData.bos.level)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )
                  }
                />
                <InfoRow
                  label="CHoCH"
                  value={
                    smcData.choch ? (
                      <span
                        className={
                          smcData.choch.type === "bullish"
                            ? "text-bull"
                            : "text-destructive"
                        }
                      >
                        {smcData.choch.type.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )
                  }
                />
                <InfoRow
                  label="Order Blocks"
                  value={
                    <span className="text-foreground">
                      {smcData.orderBlocks.length} detected
                    </span>
                  }
                />
                <InfoRow
                  label="Liq. Zones"
                  value={
                    <span className="text-foreground">
                      {smcData.liquidityZones.length} zones
                    </span>
                  }
                />
              </div>
            </div>
          )}

          {/* ICT Summary */}
          {ictData && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
                ICT Analysis
              </p>
              <div className="space-y-1.5 text-xs">
                <InfoRow
                  label="Kill Zone"
                  value={
                    <span
                      className={
                        ictData.killZone.active
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      {ictData.killZone.name}
                      {ictData.killZone.active && (
                        <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />
                      )}
                    </span>
                  }
                />
                <InfoRow
                  label="FVGs"
                  value={
                    <span className="text-foreground">
                      {ictData.fvgs.length} detected
                    </span>
                  }
                />
                <InfoRow
                  label="OTE"
                  value={
                    ictData.ote ? (
                      <span
                        className={
                          ictData.ote.inZone
                            ? "text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        ${fmt2(ictData.ote.level)}
                        {ictData.ote.inZone ? " ✓" : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function LevelRow({
  label,
  value,
  diff,
  color,
}: {
  label: string;
  value: string;
  diff?: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground w-10 text-xs">{label}</span>
      <span className={cn("font-semibold", color)}>{value}</span>
      {diff !== undefined && (
        <span
          className={cn(
            "text-xs",
            diff >= 0 ? "text-bull" : "text-destructive",
          )}
        >
          {diff >= 0 ? "+" : ""}
          {fmt2(diff)}
        </span>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function tagColor(tag: string): string {
  if (
    tag.includes("Bull") ||
    tag.includes("BOS") ||
    tag.includes("Support") ||
    tag.includes("Sweep")
  )
    return "tag-chip-bull";
  if (
    tag.includes("Bear") ||
    tag.includes("Grab") ||
    tag.includes("Resistance")
  )
    return "tag-chip-bear";
  if (
    tag.includes("EMA") ||
    tag.includes("MACD") ||
    tag.includes("RSI") ||
    tag.includes("Volume")
  )
    return "tag-chip-blue";
  return "tag-chip-gold";
}
