import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BacktestResult,
  TradeResult,
  TradingSignal,
  UserSettings,
} from "../backend";
import { useActor } from "./useActor";

export function useAllSignals() {
  const { actor, isFetching } = useActor();
  return useQuery<TradingSignal[]>({
    queryKey: ["signals", "all"],
    queryFn: async () => (actor ? actor.getAllSignals() : []),
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useActiveSignals() {
  const { actor, isFetching } = useActor();
  return useQuery<TradingSignal[]>({
    queryKey: ["signals", "active"],
    queryFn: async () => (actor ? actor.getActiveSignals() : []),
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

export function useTradeHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<TradeResult[]>({
    queryKey: ["trades"],
    queryFn: async () => (actor ? actor.getTradeHistory() : []),
    enabled: !!actor && !isFetching,
  });
}

export function usePriceCache() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["price", "cache"],
    queryFn: async () => (actor ? actor.getPriceCache() : null),
    enabled: !!actor && !isFetching,
    refetchInterval: 60000,
  });
}

export function useUserSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<UserSettings>({
    queryKey: ["settings"],
    queryFn: async () =>
      actor
        ? actor.getUserSettings()
        : {
            riskPercentage: 1,
            maxDailyTrades: BigInt(3),
            preferredTimeframe: "1H",
            notificationsEnabled: true,
            autoTrade: false,
          },
    enabled: !!actor && !isFetching,
  });
}

export function useBacktestResults() {
  const { actor, isFetching } = useActor();
  return useQuery<BacktestResult[]>({
    queryKey: ["backtest", "results"],
    queryFn: async () => (actor ? actor.getBacktestResults() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useCreateSignal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (signal: TradingSignal) => {
      if (!actor) throw new Error("No actor");
      return actor.createSignal(signal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

export function useUpdateSignalStatus() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: bigint; status: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateSignalStatus(id, status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

export function useDeleteSignal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteSignal(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

export function useAddTradeResult() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trade: TradeResult) => {
      if (!actor) throw new Error("No actor");
      return actor.addTradeResult(trade);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
    },
  });
}

export function useRefreshPrice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.refreshPrice();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price"] });
    },
  });
}

export function useSaveBacktestResult() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (result: BacktestResult) => {
      if (!actor) throw new Error("No actor");
      return actor.saveBacktestResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backtest"] });
    },
  });
}

export function useUpdateUserSettings() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      if (!actor) throw new Error("No actor");
      return actor.updateUserSettings(settings);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
