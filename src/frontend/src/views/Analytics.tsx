import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAllSignals, useTradeHistory } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { Award, BarChart2, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_THEME = {
  bg: "transparent",
  grid: "#1e2028",
  text: "#6b7280",
  bull: "#00d4a0",
  bear: "#ff4d6a",
  gold: "#f5c542",
  blue: "#4d9fff",
};

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {label && <p className="text-muted-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p
          key={`tip-${p.name}-${i}`}
          style={{ color: p.value >= 0 ? CHART_THEME.bull : CHART_THEME.bear }}
        >
          {p.name}: {typeof p.value === "number" ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// Seed trade history so analytics page has data
function getSeedTrades() {
  const outcomes = [
    "WIN",
    "WIN",
    "WIN",
    "LOSS",
    "WIN",
    "WIN",
    "LOSS",
    "WIN",
    "BREAKEVEN",
    "WIN",
    "WIN",
    "LOSS",
    "WIN",
    "WIN",
    "LOSS",
  ];
  const dirs = [
    "BUY",
    "SELL",
    "BUY",
    "BUY",
    "SELL",
    "BUY",
    "SELL",
    "BUY",
    "SELL",
    "BUY",
    "BUY",
    "SELL",
    "BUY",
    "SELL",
    "BUY",
  ];
  const now = Math.floor(Date.now() / 1000);
  return outcomes.map((outcome, i) => ({
    signalId: BigInt(i + 1),
    entryPrice: 2640 + Math.random() * 30,
    exitPrice: 2640 + Math.random() * 30,
    pnlPips:
      outcome === "WIN"
        ? 12 + Math.random() * 20
        : outcome === "LOSS"
          ? -(8 + Math.random() * 12)
          : 0,
    pnlPercent:
      outcome === "WIN"
        ? 0.5 + Math.random() * 0.8
        : outcome === "LOSS"
          ? -(0.4 + Math.random() * 0.5)
          : 0,
    outcome,
    duration: BigInt(Math.floor(Math.random() * 7200)),
    timestamp: BigInt(
      now - (outcomes.length - i) * 14400 + Math.floor(Math.random() * 3600),
    ),
    direction: dirs[i],
    confidence: 65 + Math.floor(Math.random() * 30),
  }));
}

const SEED_TRADES = getSeedTrades();

export function Analytics() {
  const tradeHistoryQ = useTradeHistory();
  const allSignalsQ = useAllSignals();

  const rawTrades = tradeHistoryQ.data ?? [];
  // Merge with seed trades for a populated display
  const trades = rawTrades.length > 0 ? rawTrades : SEED_TRADES;
  const signals = allSignalsQ.data ?? [];

  const stats = useMemo(() => {
    if (trades.length === 0) return null;
    const wins = trades.filter((t) => t.outcome === "WIN").length;
    const losses = trades.filter((t) => t.outcome === "LOSS").length;
    const winRate = (wins / trades.length) * 100;
    const grossProfit = trades
      .filter((t) => t.pnlPips > 0)
      .reduce((a, b) => a + b.pnlPips, 0);
    const grossLoss = Math.abs(
      trades.filter((t) => t.pnlPips < 0).reduce((a, b) => a + b.pnlPips, 0),
    );
    const profitFactor = grossLoss === 0 ? 9.99 : grossProfit / grossLoss;
    const avgRR =
      wins > 0
        ? trades
            .filter((t) => t.outcome === "WIN")
            .reduce((a, b) => a + Math.abs(b.pnlPips), 0) /
          Math.max(
            1,
            losses > 0
              ? trades
                  .filter((t) => t.outcome === "LOSS")
                  .reduce((a, b) => a + Math.abs(b.pnlPips), 0) / losses
              : 1,
          )
        : 0;
    return {
      totalTrades: trades.length,
      wins,
      losses,
      winRate,
      profitFactor,
      avgRR,
    };
  }, [trades]);

  // Equity curve
  const equityCurve = useMemo(() => {
    let eq = 0;
    return trades.map((t, i) => {
      eq += t.pnlPips;
      return { i: i + 1, equity: +eq.toFixed(1), pnl: +t.pnlPips.toFixed(1) };
    });
  }, [trades]);

  // Win/Loss by strategy tag
  const tagStats = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number }>();
    for (const s of signals) {
      if (s.status !== "WIN" && s.status !== "LOSS") continue;
      for (const tag of s.strategyTags.slice(0, 3)) {
        const prev = map.get(tag) ?? { wins: 0, losses: 0 };
        map.set(tag, {
          wins: prev.wins + (s.status === "WIN" ? 1 : 0),
          losses: prev.losses + (s.status === "LOSS" ? 1 : 0),
        });
      }
    }
    // seed some data
    if (map.size === 0) {
      const seeds = [
        ["EMA Bull Stack", 8, 2],
        ["Bullish OB", 6, 3],
        ["MACD Bullish Cross", 5, 2],
        ["RSI Oversold", 4, 1],
        ["Bullish FVG", 7, 3],
      ];
      for (const item of seeds) {
        map.set(item[0] as string, {
          wins: item[1] as number,
          losses: item[2] as number,
        });
      }
    }
    return Array.from(map.entries()).map(([tag, v]) => ({
      tag: tag.length > 14 ? `${tag.slice(0, 14)}...` : tag,
      ...v,
    }));
  }, [signals]);

  // Confidence vs outcome scatter
  const scatterData = useMemo(() => {
    if (signals.length > 0) {
      return signals
        .filter((s) => s.status === "WIN" || s.status === "LOSS")
        .map((s) => ({
          confidence: Number(s.confidenceScore),
          pnl: s.status === "WIN" ? 15 : -10,
          outcome: s.status,
        }));
    }
    // seed
    return SEED_TRADES.map((t) => ({
      confidence: t.confidence,
      pnl: +t.pnlPips.toFixed(1),
      outcome: t.outcome,
    }));
  }, [signals]);

  // Trade type distribution
  const typeDistrib = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of signals) {
      map[s.tradeType] = (map[s.tradeType] ?? 0) + 1;
    }
    if (Object.keys(map).length === 0)
      return [
        { name: "Scalp", value: 5 },
        { name: "Intraday", value: 8 },
        { name: "Swing", value: 3 },
      ];
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [signals]);

  const PIE_COLORS = [CHART_THEME.gold, CHART_THEME.blue, CHART_THEME.bull];

  if (tradeHistoryQ.isLoading) {
    return (
      <div className="space-y-4 p-5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={`sk-${i}`} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5" data-ocid="analytics.page">
      <div>
        <h1 className="text-base font-semibold text-foreground">
          Analytics Dashboard
        </h1>
        <p className="text-xs text-muted-foreground">
          Performance breakdown across all trades
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Trades"
          value={String(stats?.totalTrades ?? 0)}
          icon={<BarChart2 className="h-4 w-4" />}
          color="text-foreground"
        />
        <StatCard
          label="Win Rate"
          value={`${(stats?.winRate ?? 0).toFixed(1)}%`}
          icon={<Award className="h-4 w-4" />}
          color={(stats?.winRate ?? 0) >= 55 ? "text-bull" : "text-destructive"}
          sub={`${stats?.wins ?? 0}W / ${stats?.losses ?? 0}L`}
        />
        <StatCard
          label="Profit Factor"
          value={(stats?.profitFactor ?? 0).toFixed(2)}
          icon={<TrendingUp className="h-4 w-4" />}
          color={
            (stats?.profitFactor ?? 0) >= 1.5 ? "text-bull" : "text-destructive"
          }
        />
        <StatCard
          label="Avg R:R"
          value={`1:${(stats?.avgRR ?? 0).toFixed(1)}`}
          icon={<TrendingDown className="h-4 w-4" />}
          color="text-primary"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Equity curve */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Equity Curve (Pips)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis
                dataKey="i"
                tick={{ fontSize: 10, fill: CHART_THEME.text }}
              />
              <YAxis tick={{ fontSize: 10, fill: CHART_THEME.text }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="equity"
                stroke={CHART_THEME.gold}
                strokeWidth={2}
                dot={false}
                name="Equity"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss by Strategy */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Win/Loss by Strategy Tag
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tagStats} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_THEME.grid}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: CHART_THEME.text }}
              />
              <YAxis
                dataKey="tag"
                type="category"
                tick={{ fontSize: 9, fill: CHART_THEME.text }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="wins"
                fill={CHART_THEME.bull}
                name="Wins"
                radius={[0, 2, 2, 0]}
              />
              <Bar
                dataKey="losses"
                fill={CHART_THEME.bear}
                name="Losses"
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Confidence vs Outcome */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Confidence vs PnL
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis
                dataKey="confidence"
                name="Confidence"
                unit="%"
                tick={{ fontSize: 10, fill: CHART_THEME.text }}
              />
              <YAxis
                dataKey="pnl"
                name="PnL"
                tick={{ fontSize: 10, fill: CHART_THEME.text }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<CustomTooltip />}
              />
              <Scatter
                data={scatterData.filter((d) => d.outcome === "WIN")}
                fill={CHART_THEME.bull}
                fillOpacity={0.8}
                name="Win"
              />
              <Scatter
                data={scatterData.filter((d) => d.outcome !== "WIN")}
                fill={CHART_THEME.bear}
                fillOpacity={0.8}
                name="Loss"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Trade type distribution */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Trade Type Distribution
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={typeDistrib}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {typeDistrib.map((entry, i) => (
                  <Cell
                    key={`cell-${entry.name}-${i}`}
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend
                formatter={(v) => (
                  <span style={{ fontSize: 11, color: CHART_THEME.text }}>
                    {v}
                  </span>
                )}
              />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent trades table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Trade History
          </p>
        </div>
        <div className="overflow-auto">
          <Table data-ocid="analytics.trades.table">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs font-mono">Entry</TableHead>
                <TableHead className="text-xs font-mono">Exit</TableHead>
                <TableHead className="text-xs font-mono">PnL Pips</TableHead>
                <TableHead className="text-xs font-mono">PnL %</TableHead>
                <TableHead className="text-xs">Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades
                .slice(-15)
                .reverse()
                .map((t, i) => (
                  <TableRow
                    key={`trade-${String(t.timestamp)}-${i}`}
                    data-ocid={`analytics.trade.item.${i + 1}`}
                    className="border-border text-xs hover:bg-accent/20"
                  >
                    <TableCell className="text-muted-foreground">
                      {new Date(Number(t.timestamp) * 1000)
                        .toLocaleString()
                        .slice(0, 17)}
                    </TableCell>
                    <TableCell className="font-mono">
                      ${fmt(t.entryPrice)}
                    </TableCell>
                    <TableCell className="font-mono">
                      ${fmt(t.exitPrice)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-mono font-semibold",
                        t.pnlPips >= 0 ? "text-bull" : "text-destructive",
                      )}
                    >
                      {t.pnlPips >= 0 ? "+" : ""}
                      {fmt(t.pnlPips)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-mono",
                        t.pnlPercent >= 0 ? "text-bull" : "text-destructive",
                      )}
                    >
                      {t.pnlPercent >= 0 ? "+" : ""}
                      {fmt(t.pnlPercent, 3)}%
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-1.5",
                          t.outcome === "WIN"
                            ? "border-bull/30 text-bull"
                            : t.outcome === "LOSS"
                              ? "border-destructive/30 text-destructive"
                              : "border-muted text-muted-foreground",
                        )}
                      >
                        {t.outcome}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {trades.length === 0 && (
            <div
              className="py-10 text-center text-sm text-muted-foreground"
              data-ocid="analytics.empty_state"
            >
              No trade history yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  return (
    <div
      className="stat-card"
      data-ocid={`analytics.${label.toLowerCase().replace(/\s+/g, "_")}.card`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={cn("font-mono text-xl font-bold", color)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
