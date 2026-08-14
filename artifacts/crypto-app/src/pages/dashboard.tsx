import { useAuth } from "@/contexts/AuthContext";
import { useGetWallet, useGetTradeStats, useGetActiveTrades, useGetTradeHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowUp, ArrowDown, Activity, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { format } from "date-fns";
import { symbolToDisplay } from "@/lib/symbols";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useGetWallet({ query: { enabled: !!user, queryKey: ['wallet'] as const } });
  const { data: stats, isLoading: statsLoading } = useGetTradeStats({ query: { enabled: !!user, queryKey: ['trade-stats'] as const } });
  const { data: activeTrades, isLoading: activeLoading } = useGetActiveTrades({ query: { enabled: !!user, queryKey: ['active-trades'] as const } });
  const { data: historyData, isLoading: historyLoading } = useGetTradeHistory({ limit: 50 }, { query: { enabled: !!user, queryKey: ['trade-history'] as const } });

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const active = Array.isArray(activeTrades) ? activeTrades : [];
  const history = historyData?.trades ?? [];

  if (walletLoading || statsLoading) {
    return <div className="p-4 flex justify-center mt-10">Loading dashboard...</div>;
  }

  return (
    <div className="p-4 space-y-6">

      {/* ── Balance ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Overview</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Balance</div>
            <div className="text-3xl font-bold text-emerald-400">{fmt(wallet?.balance ?? 0)}</div>
            <div className="flex gap-4 mt-6">
              <Link href="/wallet" className="flex-1">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Deposit</Button>
              </Link>
              <Link href="/wallet" className="flex-1">
                <Button variant="outline" className="w-full">Withdraw</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Stats ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Trading Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                Win Rate <Activity className="h-4 w-4 text-accent" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">
                {stats?.winRate ? `${stats.winRate.toFixed(1)}%` : "0%"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats?.totalWins || 0} wins / {stats?.totalTrades || 0} trades
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                Net P&L
                {stats && stats.netPnl >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-primary" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className={`text-2xl font-bold ${stats && stats.netPnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {stats && stats.netPnl >= 0 ? '+' : ''}{fmt(stats?.netPnl ?? 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Active Trades ── */}
      {(activeLoading || active.length > 0) && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Active Trades</h2>
            {active.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                {active.length}
              </span>
            )}
          </div>

          {activeLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
          ) : (
            <div className="space-y-3">
              {active.map(trade => (
                <Card key={trade.id} className="bg-card border-border overflow-hidden">
                  <div className="h-1 w-full bg-accent animate-pulse" />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{symbolToDisplay(trade.symbol)}</span>
                          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                            trade.direction === 'up'
                              ? 'bg-primary/15 text-primary'
                              : 'bg-destructive/15 text-destructive'
                          }`}>
                            {trade.direction === 'up'
                              ? <><ArrowUp className="w-3 h-3" /> BUY UP</>
                              : <><ArrowDown className="w-3 h-3" /> BUY DOWN</>}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(trade.createdAt), 'MMM d, HH:mm')} · {trade.duration}s · {trade.profitPercent}% payout
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Entry: {trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-bold">{fmt(trade.amount)}</div>
                        <Badge variant="outline" className="text-accent border-accent/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ACTIVE
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Trade History ── */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold tracking-tight">Trade History</h2>
          <Link href="/history" className="text-sm text-primary hover:underline">View all</Link>
        </div>

        {historyLoading ? (
          <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
        ) : history.length === 0 ? (
          <Card className="bg-card border-border border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No trades yet. Place your first trade!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map(trade => (
              <Card key={trade.id} className="bg-card border-border overflow-hidden">
                <div className={`h-1 w-full ${
                  trade.status === 'win' ? 'bg-primary' :
                  trade.status === 'loss' ? 'bg-destructive' : 'bg-muted'
                }`} />
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    {/* Left: symbol + direction + time */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{symbolToDisplay(trade.symbol)}</span>
                        <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                          trade.direction === 'up'
                            ? 'bg-primary/15 text-primary'
                            : 'bg-destructive/15 text-destructive'
                        }`}>
                          {trade.direction === 'up'
                            ? <><ArrowUp className="w-3 h-3" /> BUY UP</>
                            : <><ArrowDown className="w-3 h-3" /> BUY DOWN</>}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(trade.createdAt), 'MMM d, HH:mm')} · {trade.duration}s · {trade.profitPercent}% payout
                      </div>
                    </div>

                    {/* Right: badge */}
                    <Badge
                      variant={trade.status === 'win' ? 'default' : trade.status === 'loss' ? 'destructive' : 'outline'}
                      className={trade.status === 'win' ? 'bg-primary text-primary-foreground' : ''}
                    >
                      {trade.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 text-sm p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Amount</div>
                      <div className="font-medium">{fmt(trade.amount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Entry Price</div>
                      <div className="font-medium text-xs">
                        {trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">P&L</div>
                      <div className={`font-bold ${
                        trade.profitLoss && trade.profitLoss > 0 ? 'text-primary' :
                        trade.profitLoss && trade.profitLoss < 0 ? 'text-destructive' : ''
                      }`}>
                        {trade.profitLoss != null
                          ? (trade.profitLoss > 0 ? '+' : '') + fmt(trade.profitLoss)
                          : '—'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
