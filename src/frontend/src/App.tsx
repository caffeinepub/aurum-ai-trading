import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  Settings2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { TradingProvider, useTradingContext } from "./context/TradingContext";
import { Analytics } from "./views/Analytics";
import { Backtesting } from "./views/Backtesting";
import { Dashboard } from "./views/Dashboard";
import { Settings } from "./views/Settings";
import { Signals } from "./views/Signals";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "signals", label: "Signals", icon: Zap },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "backtesting", label: "Backtesting", icon: FlaskConical },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

export default function App() {
  return (
    <TradingProvider>
      <AppLayout />
      <Toaster theme="dark" position="bottom-right" />
    </TradingProvider>
  );
}

function AppLayout() {
  const { currentView, setCurrentView } = useTradingContext();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-border bg-sidebar transition-all duration-200 shrink-0",
          collapsed ? "w-[60px]" : "w-[220px]",
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              Au<span className="text-primary">Trader</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-2 pt-3">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              data-ocid={`nav.${id}.link`}
              onClick={() =>
                setCurrentView(id as Parameters<typeof setCurrentView>[0])
              }
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center" : "",
                currentView === id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Disclaimer banner */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-primary/8 px-4 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-xs text-primary/80">
            <strong>Educational purposes only.</strong> Not financial advice.
            Trading involves substantial risk of loss. Past performance does not
            guarantee future results.
          </p>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {currentView === "dashboard" && <Dashboard />}
          {currentView === "signals" && <Signals />}
          {currentView === "analytics" && <Analytics />}
          {currentView === "backtesting" && <Backtesting />}
          {currentView === "settings" && <Settings />}
        </main>

        {/* Footer */}
        <footer className="shrink-0 border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} AuTrader. Built with{" "}
          <span className="text-primary">❤</span> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            caffeine.ai
          </a>
        </footer>
      </div>
    </div>
  );
}
