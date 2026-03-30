import type { UserSettings } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useUpdateUserSettings, useUserSettings } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { AlertTriangle, Save, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "D"];

const DEFAULT_SETTINGS: UserSettings = {
  riskPercentage: 1,
  maxDailyTrades: BigInt(3),
  preferredTimeframe: "1H",
  notificationsEnabled: true,
  autoTrade: false,
};

export function Settings() {
  const settingsQ = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const [form, setForm] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (settingsQ.data) {
      setForm(settingsQ.data);
    }
  }, [settingsQ.data]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(form);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  if (settingsQ.isLoading) {
    return (
      <div className="p-5 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-5 max-w-2xl" data-ocid="settings.page">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground">
            Trading Configuration
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Customize risk parameters and trading preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Risk Management */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">
            Risk Management
          </h2>

          {/* Risk per trade */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="risk" className="text-sm">
                Risk Per Trade
              </Label>
              <span className="font-mono text-sm font-bold text-primary">
                {form.riskPercentage.toFixed(1)}%
              </span>
            </div>
            <Slider
              data-ocid="settings.risk.slider"
              id="risk"
              min={0.5}
              max={3}
              step={0.1}
              value={[form.riskPercentage]}
              onValueChange={([v]) =>
                setForm((f) => ({ ...f, riskPercentage: v }))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5% (Conservative)</span>
              <span>3.0% (Aggressive)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended: 1–2% per trade for long-term account preservation.
            </p>
          </div>

          {/* Max daily trades */}
          <div className="space-y-2">
            <Label htmlFor="maxTrades" className="text-sm">
              Max Daily Trades
            </Label>
            <Input
              data-ocid="settings.max_trades.input"
              id="maxTrades"
              type="number"
              min={1}
              max={20}
              value={String(form.maxDailyTrades)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  maxDailyTrades: BigInt(
                    Math.max(1, Number.parseInt(e.target.value) || 1),
                  ),
                }))
              }
              className="w-32 h-9 text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Prevent overtrading by limiting daily signal execution.
            </p>
          </div>
        </section>

        {/* Trading Preferences */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">
            Trading Preferences
          </h2>

          {/* Preferred timeframe */}
          <div className="space-y-2">
            <Label className="text-sm">Preferred Timeframe</Label>
            <Select
              value={form.preferredTimeframe}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, preferredTimeframe: v }))
              }
            >
              <SelectTrigger
                data-ocid="settings.timeframe.select"
                className="w-32 h-9 text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((tf) => (
                  <SelectItem key={tf} value={tf} className="text-sm font-mono">
                    {tf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Signal Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get alerted when new signals are generated
              </p>
            </div>
            <Switch
              data-ocid="settings.notifications.switch"
              checked={form.notificationsEnabled}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, notificationsEnabled: v }))
              }
            />
          </div>
        </section>

        {/* Automation */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Automation</h2>

          <div
            className={cn(
              "rounded-lg p-4 space-y-3",
              form.autoTrade
                ? "bg-destructive/8 border border-destructive/20"
                : "bg-muted/30",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Auto-Trade Mode</Label>
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">
                    <AlertTriangle className="h-3 w-3" /> CAUTION
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically execute trades based on generated signals. High
                  risk — monitor closely.
                </p>
              </div>
              <Switch
                data-ocid="settings.autotrade.switch"
                checked={form.autoTrade}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, autoTrade: v }))
                }
              />
            </div>
            {form.autoTrade && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                <p className="text-xs text-destructive font-medium">
                  ⚠️ Auto-trading is enabled. Losses may occur automatically. Use
                  with extreme caution. This is a demo feature only — no real
                  trades will be executed.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button
            data-ocid="settings.save.button"
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
          {updateSettings.isSuccess && (
            <span
              className="text-xs text-bull"
              data-ocid="settings.success_state"
            >
              ✓ Saved
            </span>
          )}
          {updateSettings.isError && (
            <span
              className="text-xs text-destructive"
              data-ocid="settings.error_state"
            >
              Failed to save
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
