import { useParams } from "wouter";
import { useGetAdminUser, useUpdateAdminUser, useAdjustUserBalance, useResetUserWallet, getGetAdminUserQueryKey } from "@workspace/api-client-react";
import { formatPKR } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ArrowLeft, ArrowUp, ArrowDown, Ban, ShieldOff } from "lucide-react";
import { Link } from "wouter";

const API_BASE = import.meta.env.VITE_API_URL as string;

async function patchUserBan(id: string, path: string, body: object): Promise<void> {
  const token = localStorage.getItem("crypto_token");
  const res = await fetch(`${API_BASE}/admin/users/${id}/${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
}

export default function AdminUserDetail() {
  const { id } = useParams();
  const { data, isLoading } = useGetAdminUser(id as string, { query: { enabled: !!id } });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustReason, setAdjustReason] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [wdBanReason, setWdBanReason] = useState("");
  const [showWdBan, setShowWdBan] = useState(false);
  const [wdBanLoading, setWdBanLoading] = useState(false);

  const [tradeBanReason, setTradeBanReason] = useState("");
  const [showTradeBan, setShowTradeBan] = useState(false);
  const [tradeBanLoading, setTradeBanLoading] = useState(false);

  const updateStatus = useUpdateAdminUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "User updated" });
        queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(id as string) });
      },
      onError: (err: any) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    }
  });

  const adjustBalance = useAdjustUserBalance({
    mutation: {
      onSuccess: () => {
        toast({ title: "Balance adjusted successfully" });
        queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(id as string) });
        setAdjustAmount("");
        setAdjustReason("");
      },
      onError: (err: any) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    }
  });

  const resetWallet = useResetUserWallet({
    mutation: {
      onSuccess: () => {
        toast({ title: "Wallet reset to $0.00", description: "All wallet fields cleared." });
        queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(id as string) });
        setResetReason("");
        setShowResetConfirm(false);
      },
      onError: (err: any) => {
        toast({ title: "Reset failed", description: err.message, variant: "destructive" });
      }
    }
  });

  if (isLoading) return <div className="p-4 text-center mt-10">Loading...</div>;
  if (!data) return <div className="p-4 text-center mt-10">User not found</div>;

  const { user, recentTrades, recentTransactions } = data as any;

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustAmount || !adjustReason || isNaN(Number(adjustAmount))) return;
    adjustBalance.mutate({
      id: id as string,
      data: { amount: Number(adjustAmount), type: adjustType, reason: adjustReason }
    });
  };

  async function handleWithdrawalBan(ban: boolean) {
    if (ban && !wdBanReason.trim()) return;
    setWdBanLoading(true);
    try {
      await patchUserBan(id as string, "withdrawal-ban", { banned: ban, reason: wdBanReason.trim() });
      toast({ title: ban ? "Withdrawal banned" : "Withdrawal ban lifted" });
      queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(id as string) });
      setWdBanReason("");
      setShowWdBan(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setWdBanLoading(false);
    }
  }

  async function handleTradeBan(ban: boolean) {
    if (ban && !tradeBanReason.trim()) return;
    setTradeBanLoading(true);
    try {
      await patchUserBan(id as string, "trade-ban", { banned: ban, reason: tradeBanReason.trim() });
      toast({ title: ban ? "Trading banned" : "Trade ban lifted" });
      queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(id as string) });
      setTradeBanReason("");
      setShowTradeBan(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setTradeBanLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">User Details</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              {user.phone && <div className="text-sm text-muted-foreground">{user.phone}</div>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className={user.status === 'active' ? 'bg-primary' : ''}>
                {user.status}
              </Badge>
              <Badge variant="outline">{user.role}</Badge>
              {user.withdrawalBanned && (
                <Badge variant="destructive" className="text-xs">Withdrawal Banned</Badge>
              )}
              {user.tradeBanned && (
                <Badge variant="destructive" className="text-xs">Trade Banned</Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="font-bold text-xl text-emerald-400">{formatPKR(user.balance)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Deposited</div>
              <div className="font-medium">{formatPKR(user.totalDeposited)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Profit</div>
              <div className="font-medium text-primary">{formatPKR(user.totalProfit)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Loss</div>
              <div className="font-medium text-destructive">{formatPKR(user.totalLoss)}</div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              variant={user.status === 'active' ? 'destructive' : 'default'}
              className={`flex-1 ${user.status !== 'active' ? 'bg-primary hover:bg-primary/90' : ''}`}
              onClick={() => updateStatus.mutate({ id: id as string, data: { status: user.status === 'active' ? 'frozen' : 'active' } })}
              disabled={updateStatus.isPending}
            >
              {user.status === 'active' ? 'Freeze User' : 'Unfreeze User'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Ban */}
      <Card className={user.withdrawalBanned ? "border-destructive/50" : "border-border"}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Ban className="w-4 h-4 text-destructive" />
            Withdrawal Ban
          </CardTitle>
          {user.withdrawalBanned && user.withdrawalBanReason && (
            <p className="text-xs text-destructive mt-1">
              Banned — Reason: {user.withdrawalBanReason}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          {!user.withdrawalBanned ? (
            !showWdBan ? (
              <Button variant="destructive" className="w-full" onClick={() => setShowWdBan(true)}>
                Ban Withdrawal
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Reason for banning withdrawal</Label>
                  <Input
                    placeholder="e.g. Suspicious activity, KYC pending..."
                    value={wdBanReason}
                    onChange={e => setWdBanReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowWdBan(false); setWdBanReason(""); }}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={!wdBanReason.trim() || wdBanLoading}
                    onClick={() => handleWithdrawalBan(true)}
                  >
                    {wdBanLoading ? "Banning..." : "Confirm Ban"}
                  </Button>
                </div>
              </div>
            )
          ) : (
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              disabled={wdBanLoading}
              onClick={() => handleWithdrawalBan(false)}
            >
              {wdBanLoading ? "Lifting..." : "Lift Withdrawal Ban"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Trade Ban */}
      <Card className={user.tradeBanned ? "border-destructive/50" : "border-border"}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldOff className="w-4 h-4 text-destructive" />
            Trade Ban
          </CardTitle>
          {user.tradeBanned && user.tradeBanReason && (
            <p className="text-xs text-destructive mt-1">
              Banned — Reason: {user.tradeBanReason}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          {!user.tradeBanned ? (
            !showTradeBan ? (
              <Button variant="destructive" className="w-full" onClick={() => setShowTradeBan(true)}>
                Ban Trading
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Reason for banning trading</Label>
                  <Input
                    placeholder="e.g. Market manipulation, Policy violation..."
                    value={tradeBanReason}
                    onChange={e => setTradeBanReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowTradeBan(false); setTradeBanReason(""); }}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={!tradeBanReason.trim() || tradeBanLoading}
                    onClick={() => handleTradeBan(true)}
                  >
                    {tradeBanLoading ? "Banning..." : "Confirm Ban"}
                  </Button>
                </div>
              </div>
            )
          ) : (
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              disabled={tradeBanLoading}
              onClick={() => handleTradeBan(false)}
            >
              {tradeBanLoading ? "Lifting..." : "Lift Trade Ban"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adjust Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdjust} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={adjustType} onValueChange={(v) => setAdjustType(v as "credit" | "debit")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (Add)</SelectItem>
                    <SelectItem value="debit">Debit (Remove)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" min="1" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input placeholder="e.g. Bonus, Correction, Promotion" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={adjustBalance.isPending}>
              {adjustBalance.isPending ? "Adjusting..." : "Submit Adjustment"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Reset Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Zeroes out balance, total deposited, withdrawn, profit, and loss. This action cannot be undone.
          </p>
          {!showResetConfirm ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowResetConfirm(true)}
            >
              Reset Wallet to $0.00
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Reason for reset</Label>
                <Input
                  placeholder="e.g. Fraud, New start, Admin correction"
                  value={resetReason}
                  onChange={e => setResetReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowResetConfirm(false); setResetReason(""); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={!resetReason || resetWallet.isPending}
                  onClick={() => resetWallet.mutate({ id: id as string, data: { reason: resetReason } })}
                >
                  {resetWallet.isPending ? "Resetting..." : "Confirm Reset"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {recentTrades.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Trades</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentTrades.map((trade: any) => (
              <div key={trade.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <div className="font-medium flex items-center gap-1 text-sm">
                    {trade.symbol}
                    {trade.direction === 'up'
                      ? <ArrowUp className="w-3 h-3 text-primary" />
                      : <ArrowDown className="w-3 h-3 text-destructive" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{format(new Date(trade.createdAt), "MMM d, HH:mm")}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{formatPKR(trade.amount)}</div>
                  <Badge
                    variant={trade.status === 'active' ? 'outline' : trade.status === 'win' ? 'default' : 'destructive'}
                    className={`text-xs ${trade.status === 'win' ? 'bg-primary' : ''}`}
                  >
                    {trade.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {recentTransactions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentTransactions.map((tx: any) => (
              <div key={tx.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium capitalize">{tx.type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d, HH:mm")}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{formatPKR(tx.amount)}</div>
                  <Badge
                    variant={tx.status === 'pending' ? 'outline' : tx.status === 'approved' ? 'default' : 'destructive'}
                    className={`text-xs ${tx.status === 'approved' ? 'bg-primary' : ''}`}
                  >
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
