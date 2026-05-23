import { useAuth } from "@/contexts/AuthContext";
import { useGetWallet, useGetTradeStats } from "@workspace/api-client-react";
import { formatPKR } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, TrendingDown } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useGetWallet({ query: { enabled: !!user } });
  const { data: stats, isLoading: statsLoading } = useGetTradeStats({ query: { enabled: !!user } });

  if (walletLoading || statsLoading) {
    return <div className="p-4 flex justify-center mt-10">Loading dashboard...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Overview</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Balance</div>
            <div className="text-3xl font-bold text-emerald-400">{formatPKR(wallet?.balance ?? 0)}</div>
            
            <div className="flex gap-4 mt-6">
              <Link href="/wallet" className="flex-1">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Deposit
                </Button>
              </Link>
              <Link href="/wallet" className="flex-1">
                <Button variant="outline" className="w-full">
                  Withdraw
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

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
                {stats && stats.netPnl >= 0 ? '+' : ''}{formatPKR(stats?.netPnl ?? 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
          <Link href="/history" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        
        {wallet?.recentTransactions && wallet.recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {wallet.recentTransactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'deposit' || tx.type === 'trade_win' ? 'bg-primary/20 text-primary' : 
                    tx.type === 'withdrawal' || tx.type === 'trade_loss' ? 'bg-destructive/20 text-destructive' : 
                    'bg-accent/20 text-accent'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'trade_win' ? <ArrowDownRight className="h-4 w-4" /> : 
                     tx.type === 'withdrawal' || tx.type === 'trade_loss' ? <ArrowUpRight className="h-4 w-4" /> : 
                     <Activity className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-medium capitalize text-sm">{tx.type.replace('_', ' ')}</div>
                    <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    tx.type === 'deposit' || tx.type === 'trade_win' ? 'text-primary' : 
                    tx.type === 'withdrawal' || tx.type === 'trade_loss' ? 'text-destructive' : 
                    'text-foreground'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'trade_win' ? '+' : '-'}{formatPKR(tx.amount)}
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">{tx.status}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No recent activity found.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
