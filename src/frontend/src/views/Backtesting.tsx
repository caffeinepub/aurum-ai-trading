import type { BacktestResult } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBacktestResults, useSaveBacktestResult } from "@/hooks/useQueries";
import { generateCandles, runBacktest } from "@/lib/tradingEngine";
import { cn } from "@/lib/utils";
import { ChevronDown, FlaskConical, Play, Save } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

const STRATEGIES = [
  "Full-Confluence",
  "SMC-Only",
  "ICT-Only",
  "Indicators-Only",
];
const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "D"];

const CHART_GRID = "#1e2028";
const CHART_TEXT = "#6b7280";
const CHART_GOLD = "#f5c542";

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

interface BacktestStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  equityCurve: number[];
}

const CustomTooltip = ({
  active,
  payload,
}: { active?: boolean; payload?: { value: number }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-border bg-card px-2 py-1 text-xs">
      <span
        className={payload[0].value >= 0 ? "text-bull" : "text-destructive"}
      >
        {fmt(payload[0].value)} pips
      </span>
    </div>
  );
};

export function Backtesting() {
  const [strategy, setStrategy] = useState("Full-Confluence");
  const [timeframe, setTimeframe] = useState("1H");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BacktestStats | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);

  const backtestResultsQ = useBacktestResults();
  const saveResult = useSaveBacktestResult();

  const handleRun = async () => {
    setIsRunning(true);
    setResults(null);
    try {
      // Simulate async work
      await new Promise((r) => setTimeout(r, 800));
      const candles = generateCandles(timeframe, 400);
      const stats = runBacktest(strategy, candles);
      setResults(stats);
      toast.success(
        `Backtest complete — ${stats.totalTrades} trades simulated`,
      );
    } catch {
      toast.error("Backtest failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = async () => {
    if (!results) return;
    try {
      const record: BacktestResult = {
        id: BigInt(0),
        strategyName: `${strategy} / ${timeframe}`,
        startDate: BigInt(Math.floor(Date.now() / 1000) - 86400 * 30),
        endDate: BigInt(Math.floor(Date.now() / 1000)),
        totalTrades: BigInt(results.totalTrades),
        winRate: results.winRate,
        profitFactor: results.profitFactor,
        maxDrawdown: results.maxDrawdown,
        sharpeRatio: results.sharpeRatio,
        resultsJSON: JSON.stringify(results),
      };
      await saveResult.mutateAsync(record);
      toast.success("Backtest result saved");
    } catch {
      toast.error("Failed to save result");
    }
  };

  const equityCurveData =
    results?.equityCurve.map((v, i) => ({ i, equity: v })) ?? [];

  return (
    <div className="p-5 space-y-5" data-ocid="backtesting.page">
      <div>
        <h1 className="text-base font-semibold text-foreground">
          Strategy Backtester
        </h1>
        <p className="text-xs text-muted-foreground">
          Simulate strategies on synthetic XAUUSD historical data
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Strategy</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger
                data-ocid="backtesting.strategy.select"
                className="h-9 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger
                data-ocid="backtesting.timeframe.select"
                className="h-9 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((tf) => (
                  <SelectItem key={tf} value={tf} className="text-xs font-mono">
                    {tf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          data-ocid="backtesting.run.button"
          onClick={handleRun}
          disabled={isRunning}
          className="gap-2 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
          variant="ghost"
        >
          <Play className={cn("h-4 w-4", isRunning && "animate-spin")} />
          {isRunning ? "Running simulation..." : "Run Backtest"}
        </Button>
      </div>

      {/* Loading */}
      {isRunning && (
        <div className="space-y-3" data-ocid="backtesting.loading_state">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {/* Results */}
      {results && !isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
          data-ocid="backtesting.results.panel"
        >
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MetricCard
              label="Total Trades"
              value={String(results.totalTrades)}
            />
            <MetricCard
              label="Win Rate"
              value={`${(results.winRate * 100).toFixed(1)}%`}
              color={results.winRate >= 0.55 ? "text-bull" : "text-destructive"}
            />
            <MetricCard
              label="Profit Factor"
              value={fmt(results.profitFactor)}
              color={
                results.profitFactor >= 1.5 ? "text-bull" : "text-destructive"
              }
            />
            <MetricCard
              label="Max Drawdown"
              value={`${fmt(results.maxDrawdown)} pips`}
              color="text-destructive"
            />
            <MetricCard
              label="Sharpe Ratio"
              value={fmt(results.sharpeRatio)}
              color={
                results.sharpeRatio >= 1 ? "text-bull" : "text-muted-foreground"
              }
            />
          </div>

          {/* Equity curve */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Equity Curve (Pips)
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={equityCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis
                  dataKey="i"
                  tick={{ fontSize: 10, fill: CHART_TEXT }}
                  label={{
                    value: "Trade #",
                    position: "insideBottom",
                    offset: -4,
                    fontSize: 10,
                    fill: CHART_TEXT,
                  }}
                />
                <YAxis tick={{ fontSize: 10, fill: CHART_TEXT }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke={
                    equityCurveData[equityCurveData.length - 1]?.equity >= 0
                      ? CHART_GOLD
                      : "#ff4d6a"
                  }
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Win/Loss summary */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Trade Summary — {strategy} / {timeframe}
              </p>
              <Button
                data-ocid="backtesting.save.button"
                size="sm"
                onClick={handleSave}
                disabled={saveResult.isPending}
                variant="outline"
                className="gap-1.5 text-xs h-7"
              >
                <Save className="h-3.5 w-3.5" />
                {saveResult.isPending ? "Saving..." : "Save Result"}
              </Button>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Wins: </span>
                <span className="font-mono font-bold text-bull">
                  {results.wins}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Losses: </span>
                <span className="font-mono font-bold text-destructive">
                  {results.losses}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">B/E: </span>
                <span className="font-mono font-bold text-muted-foreground">
                  {results.totalTrades - results.wins - results.losses}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Saved Results */}
      <Collapsible open={savedOpen} onOpenChange={setSavedOpen}>
        <CollapsibleTrigger
          data-ocid="backtesting.saved_results.toggle"
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent/20 transition-colors"
        >
          <span className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            Saved Backtest Results ({backtestResultsQ.data?.length ?? 0})
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              savedOpen && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2">
            {backtestResultsQ.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (backtestResultsQ.data ?? []).length === 0 ? (
              <div
                className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
                data-ocid="backtesting.saved_results.empty_state"
              >
                No saved results yet. Run a backtest and save it.
              </div>
            ) : (
              (backtestResultsQ.data ?? []).map((r, i) => (
                <div
                  key={String(r.id)}
                  data-ocid={`backtesting.saved.item.${i + 1}`}
                  className="rounded-lg border border-border bg-card/50 p-3"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">
                      {r.strategyName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(Number(r.endDate) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs font-mono">
                    <span>
                      Trades:{" "}
                      <span className="text-foreground">
                        {String(r.totalTrades)}
                      </span>
                    </span>
                    <span>
                      Win Rate:{" "}
                      <span
                        className={
                          r.winRate >= 0.55 ? "text-bull" : "text-destructive"
                        }
                      >
                        {(r.winRate * 100).toFixed(1)}%
                      </span>
                    </span>
                    <span>
                      PF:{" "}
                      <span
                        className={
                          r.profitFactor >= 1.5
                            ? "text-bull"
                            : "text-destructive"
                        }
                      >
                        {fmt(r.profitFactor)}
                      </span>
                    </span>
                    <span>
                      Sharpe:{" "}
                      <span className="text-foreground">
                        {fmt(r.sharpeRatio)}
                      </span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color = "text-foreground",
}: { label: string; value: string; color?: string }) {
  return (
    <div className="stat-card">
      <span className="text-xs text-muted-foreground block mb-1">{label}</span>
      <span className={cn("font-mono text-lg font-bold", color)}>{value}</span>
    </div>
  );
}
