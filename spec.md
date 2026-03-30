# Aurum AI - XAUUSD Trading Intelligence Platform

## Current State
New project. No existing files.

## Requested Changes (Diff)

### Add
- Full professional trading dashboard for XAUUSD (Gold) Forex trading
- Live price feed integration via HTTP outcalls to free Forex API
- Multi-timeframe analysis engine (1m, 5m, 15m, 1H, 4H, Daily)
- Algorithmic strategy engine: SMC (Order Blocks, Liquidity Zones, BOS, CHoCH), ICT (FVG, Kill Zones), RSI, MACD, EMA, VWAP, Support/Resistance, Volume
- AI confidence scoring system (0-100%) with weighted decision engine
- Signal generation: Entry, SL, TP1/TP2/TP3, R:R ratio, trade type, confidence
- Risk management: ATR-based SL/TP, max risk %, news filter indicators
- TradingView widget chart integration
- Signal panel with real-time refresh
- Trade history & analytics (win rate, avg R:R, drawdown)
- AI explanation panel (reasoning per signal)
- Dark professional UI themed for institutional traders
- Backtesting panel with strategy performance metrics
- Candle data simulation + algorithmic computation in frontend

### Modify
N/A

### Remove
N/A

## Implementation Plan

### Backend (Motoko)
- Store saved signals, trade history, user settings
- Persist backtesting results
- Store analytics data (win rate, drawdown, equity curve)
- HTTP outcalls to fetch live XAUUSD price from public Forex API (e.g., frankfurter.app or metals-api alternative)
- Expose getSignals, saveSignal, getHistory, getAnalytics, getLivePrice endpoints

### Frontend (React/TypeScript)
- Dark trading dashboard layout: sidebar nav, main chart area, signal panel, analytics
- TradingView lightweight-charts or TradingView widget embed for XAUUSD live chart
- Algorithmic engine in TypeScript:
  - Candle generation/simulation for multi-timeframe
  - SMC: detect order blocks, liquidity grabs, BOS/CHoCH
  - ICT: FVG detection, kill zone time filters
  - Indicators: RSI with divergence, MACD crossovers, EMA 20/50/200, VWAP
  - Support/Resistance auto-detection
  - Volume analysis
  - Confluence scorer: weighted votes from all strategies
  - ATR-based SL/TP calculator
  - Confidence threshold filter (>65% to generate signal)
- Signal display cards: Entry, SL, TP1/2/3, R:R, type badge, confidence meter
- AI reasoning panel: explains which signals triggered and why
- Analytics: equity curve chart, win rate gauge, drawdown tracker
- Backtesting panel: run strategies on historical data, show performance
- News filter UI: show upcoming high-impact events (static/mock)
- Settings panel: risk %, max trades, timeframe preference
