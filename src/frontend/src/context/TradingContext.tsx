import { type ReactNode, createContext, useContext, useState } from "react";

type View = "dashboard" | "signals" | "analytics" | "backtesting" | "settings";
type Timeframe = "1m" | "5m" | "15m" | "1H" | "4H" | "D";

interface TradingContextValue {
  currentView: View;
  setCurrentView: (v: View) => void;
  selectedTimeframe: Timeframe;
  setSelectedTimeframe: (tf: Timeframe) => void;
}

const TradingContext = createContext<TradingContextValue | null>(null);

export function TradingProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1H");

  return (
    <TradingContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedTimeframe,
        setSelectedTimeframe,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export function useTradingContext() {
  const ctx = useContext(TradingContext);
  if (!ctx)
    throw new Error("useTradingContext must be used within TradingProvider");
  return ctx;
}
