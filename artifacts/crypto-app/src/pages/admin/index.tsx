import { useGetAdminStats, useGetTradeSettings, useSetTradeSetting, getGetTradeSettingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Link } from "wouter";
import { formatPKR } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const OUTCOME_OPTIONS = [
  { value: "auto", label: "AUTO", color: "" },
  { value: "win",  label: "WIN",  color: "emerald" },
  { value: "loss", label: "LOSS", color: "red" },
] as const;

const PKR_SYMBOLS = new Set(["BTCPKR", "BNBPKR"]);

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();
  const { data: tradeSettings, isLoading: settingsLoading } = useGetTradeSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const setOutcome = useSetTradeSetting({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTradeSettingsQueryKey() });
        toast({ title: "Trade outcome updated" });
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    },
  });

  if (isLoading) return <div className="p-4 text-center mt-10">Loading admin stats...</div>;

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Users <Users className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            <div className="text-xs text-muted-foreground mt-1">{stats?.activeUsers} active</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Platform P&L <TrendingUp className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`text-xl font-bold ${stats && stats.platformPnl >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatPKR(stats?.platformPnl ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Vol: {formatPKR(stats?.todayVolume ?? 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Pending Dep <TrendingDown className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-400">{stats?.pendingDeposits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Pending W/D <TrendingUp className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-400">{stats?.pendingWithdrawals}</div>
          </CardContent>
        </Card>
      </div>

      {/* Trade Outcome Control */}
      <Card className="border-amber-500/30 bg-amber-950/10">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-amber-400" />
            Trade Outcome Control
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            AUTO = price-based result. WIN / LOSS forces the outcome for all settling trades on that symbol.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {settingsLoading ? (
            <div className="text-sm text-muted-foreground py-2">Loading...</div>
          ) : (
            <div className="space-y-3">
              {(tradeSettings ?? []).map((s) => (
                <div key={s.symbol} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-sm font-bold">{s.symbol}</span>
                    {PKR_SYMBOLS.has(s.symbol) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-800/50 text-emerald-300 font-semibold">PKR</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {OUTCOME_OPTIONS.map((opt) => {
                      const isActive = s.outcome === opt.value;
                      const activeClass =
                        opt.value === "win"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : opt.value === "loss"
                          ? "bg-red-600 border-red-600 text-white"
                          : "bg-secondary border-secondary text-secondary-foreground";
                      return (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setOutcome.mutate({ data: { symbol: s.symbol, outcome: opt.value } })
                          }
                          disabled={setOutcome.isPending}
                          className={`px-2.5 py-1 rounded text-xs font-bold border transition-all ${
                            isActive
                              ? `${activeClass} shadow-sm scale-105`
                              : "border-border text-muted-foreground hover:border-foreground/40 bg-transparent"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Nav */}
      <div className="space-y-3">
        <Link href="/admin/users" className="block">
          <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div className="font-bold">Manage Users</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/transactions" className="block">
          <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-muted-foreground" />
              <div className="font-bold">Transactions</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/trades" className="block">
          <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <div className="font-bold">All Trades</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
