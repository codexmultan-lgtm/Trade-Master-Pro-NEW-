import { useGetAdminStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading) return <div className="p-4 text-center mt-10">Loading admin stats...</div>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>

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
              Platform P&L <DollarSign className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`text-2xl font-bold ${stats && stats.platformPnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
              ${stats?.platformPnl.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total volume: ${stats?.todayVolume.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Pending Dep <TrendingDown className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-accent">{stats?.pendingDeposits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Pending W/D <TrendingUp className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-accent">{stats?.pendingWithdrawals}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Link href="/admin/users" className="block">
          <Card className="hover:bg-accent/5 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div className="font-bold">Manage Users</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/transactions" className="block">
          <Card className="hover:bg-accent/5 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
                <div className="font-bold">Transactions</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/trades" className="block">
          <Card className="hover:bg-accent/5 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-muted-foreground" />
                <div className="font-bold">All Trades</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
