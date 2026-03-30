import type { TradingSignal } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTradingContext } from "@/context/TradingContext";
import {
  useAllSignals,
  useCreateSignal,
  useDeleteSignal,
  useUpdateSignalStatus,
} from "@/hooks/useQueries";
import { generateSignal } from "@/lib/tradingEngine";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "D"] as const;

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTs(ts: bigint) {
  return new Date(Number(ts) * 1000).toLocaleString();
}

export function Signals() {
  const { selectedTimeframe, setSelectedTimeframe } = useTradingContext();
  const allSignalsQ = useAllSignals();
  const createSignal = useCreateSignal();
  const updateStatus = useUpdateSignalStatus();
  const deleteSignal = useDeleteSignal();

  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<bigint | null>(null);
  const [filterDir, setFilterDir] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [minConf, setMinConf] = useState("");
  const [search, setSearch] = useState("");

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = generateSignal(selectedTimeframe);
      if (!result) {
        toast.info("No signal found — confidence below 65% threshold.");
        return;
      }
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
        `${result.direction} signal created — ${result.confidence}% confidence`,
      );
    } catch {
      toast.error("Failed to generate signal");
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTimeframe, createSignal]);

  const signals = allSignalsQ.data ?? [];

  const filtered = signals.filter((s) => {
    if (filterDir !== "ALL" && s.direction !== filterDir) return false;
    if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
    if (filterType !== "ALL" && s.tradeType !== filterType) return false;
    if (minConf && Number(s.confidenceScore) < Number(minConf)) return false;
    if (search && !s.symbol.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full" data-ocid="signals.page">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            Signal Management
          </h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} signals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedTimeframe}
            onValueChange={(v) =>
              setSelectedTimeframe(v as typeof selectedTimeframe)
            }
          >
            <SelectTrigger
              data-ocid="signals.timeframe.select"
              className="h-8 w-20 text-xs"
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
          <Button
            data-ocid="signals.generate.button"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-1.5 text-xs bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
            variant="ghost"
          >
            <Zap
              className={cn("h-3.5 w-3.5", isGenerating && "animate-pulse")}
            />
            {isGenerating ? "Analyzing..." : "Generate Signal"}
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            data-ocid="signals.search.input"
            placeholder="Symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-28 pl-7 text-xs"
          />
        </div>
        <Select value={filterDir} onValueChange={setFilterDir}>
          <SelectTrigger
            data-ocid="signals.direction.select"
            className="h-8 w-24 text-xs"
          >
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All Dir.
            </SelectItem>
            <SelectItem value="BUY" className="text-xs text-bull">
              BUY
            </SelectItem>
            <SelectItem value="SELL" className="text-xs text-destructive">
              SELL
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger
            data-ocid="signals.status.select"
            className="h-8 w-24 text-xs"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All Status
            </SelectItem>
            <SelectItem value="ACTIVE" className="text-xs">
              Active
            </SelectItem>
            <SelectItem value="WIN" className="text-xs">
              Win
            </SelectItem>
            <SelectItem value="LOSS" className="text-xs">
              Loss
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger
            data-ocid="signals.type.select"
            className="h-8 w-24 text-xs"
          >
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All Types
            </SelectItem>
            <SelectItem value="Scalp" className="text-xs">
              Scalp
            </SelectItem>
            <SelectItem value="Intraday" className="text-xs">
              Intraday
            </SelectItem>
            <SelectItem value="Swing" className="text-xs">
              Swing
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          data-ocid="signals.confidence.input"
          placeholder="Min conf %"
          value={minConf}
          onChange={(e) => setMinConf(e.target.value)}
          className="h-8 w-24 text-xs"
          type="number"
          min="0"
          max="100"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {allSignalsQ.isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20"
            data-ocid="signals.empty_state"
          >
            <Zap className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              No signals yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate your first signal using the engine above
            </p>
          </div>
        ) : (
          <Table data-ocid="signals.table">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs w-6" />
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Dir</TableHead>
                <TableHead className="text-xs font-mono">Entry</TableHead>
                <TableHead className="text-xs font-mono">SL</TableHead>
                <TableHead className="text-xs font-mono">TP1</TableHead>
                <TableHead className="text-xs">R:R</TableHead>
                <TableHead className="text-xs">Conf</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Tags</TableHead>
                <TableHead className="text-xs w-16">Act.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sig, idx) => (
                <>
                  <TableRow
                    key={String(sig.id)}
                    data-ocid={`signals.item.${idx + 1}`}
                    className={cn(
                      "border-border cursor-pointer transition-colors text-xs",
                      sig.direction === "BUY"
                        ? "hover:bg-bull/5"
                        : "hover:bg-destructive/5",
                      sig.status === "WIN" && "opacity-60",
                      sig.status === "LOSS" && "opacity-60",
                    )}
                    onClick={() =>
                      setExpandedId(expandedId === sig.id ? null : sig.id)
                    }
                  >
                    <TableCell className="py-2 pr-0">
                      {expandedId === sig.id ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-muted-foreground">
                      {formatTs(sig.timestamp).slice(0, 17)}
                    </TableCell>
                    <TableCell className="py-2">
                      <span
                        className={cn(
                          "flex items-center gap-1 font-bold",
                          sig.direction === "BUY"
                            ? "text-bull"
                            : "text-destructive",
                        )}
                      >
                        {sig.direction === "BUY" ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {sig.direction}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 font-mono">
                      ${fmt(sig.entryPrice)}
                    </TableCell>
                    <TableCell className="py-2 font-mono text-destructive">
                      ${fmt(sig.stopLoss)}
                    </TableCell>
                    <TableCell className="py-2 font-mono text-bull">
                      ${fmt(sig.takeProfit1)}
                    </TableCell>
                    <TableCell className="py-2 font-mono">
                      1:{sig.rrRatio.toFixed(1)}
                    </TableCell>
                    <TableCell className="py-2">
                      <ConfidencePill score={Number(sig.confidenceScore)} />
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-xs px-1.5">
                        {sig.tradeType}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <StatusBadge status={sig.status} />
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {sig.strategyTags.slice(0, 2).map((tag) => (
                          <span key={tag} className="tag-chip text-xs">
                            {tag}
                          </span>
                        ))}
                        {sig.strategyTags.length > 2 && (
                          <span className="tag-chip text-xs">
                            +{sig.strategyTags.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1">
                        {sig.status === "ACTIVE" && (
                          <>
                            <button
                              type="button"
                              data-ocid={`signals.win.button.${idx + 1}`}
                              className="rounded p-1 text-bull hover:bg-bull/15 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatus.mutate({
                                  id: sig.id,
                                  status: "WIN",
                                });
                              }}
                              title="Mark Win"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              data-ocid={`signals.loss.button.${idx + 1}`}
                              className="rounded p-1 text-destructive hover:bg-destructive/15 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatus.mutate({
                                  id: sig.id,
                                  status: "LOSS",
                                });
                              }}
                              title="Mark Loss"
                            >
                              ✗
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          data-ocid={`signals.delete.button.${idx + 1}`}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSignal.mutate(sig.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === sig.id && (
                    <TableRow
                      key={`${String(sig.id)}-expanded`}
                      className="border-border"
                    >
                      <TableCell
                        colSpan={12}
                        className="bg-accent/20 py-3 px-6"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            AI Reasoning
                          </p>
                          <p className="text-xs text-foreground leading-relaxed">
                            {sig.aiReasoning}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {sig.strategyTags.map((tag) => (
                              <span
                                key={tag}
                                className="tag-chip-gold tag-chip"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-4 pt-2 font-mono text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                TP2:{" "}
                              </span>
                              <span className="text-bull">
                                ${fmt(sig.takeProfit2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                TP3:{" "}
                              </span>
                              <span className="text-bull opacity-70">
                                ${fmt(sig.takeProfit3)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Symbol:{" "}
                              </span>
                              <span className="text-foreground">
                                {sig.symbol}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function ConfidencePill({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-bull"
      : score >= 65
        ? "text-primary"
        : "text-destructive";
  return (
    <span className={cn("font-mono font-bold text-xs", color)}>{score}%</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    ACTIVE: { cls: "border-primary/30 text-primary", label: "Active" },
    WIN: { cls: "border-bull/30 text-bull", label: "Win" },
    LOSS: { cls: "border-destructive/30 text-destructive", label: "Loss" },
    BREAKEVEN: { cls: "border-muted text-muted-foreground", label: "B/E" },
  };
  const c = cfg[status] ?? cfg.ACTIVE;
  return (
    <Badge variant="outline" className={cn("text-xs px-1.5 py-0", c.cls)}>
      {c.label}
    </Badge>
  );
}
