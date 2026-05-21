import { useParams } from "wouter";
import { useGetAdminUser, useUpdateAdminUser, useAdjustUserBalance, getGetAdminUserQueryKey } from "@workspace/api-client-react";
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
import { ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "wouter";

export default function AdminUserDetail() {
  const { id } = useParams();
  const { data, isLoading } = useGetAdminUser(id as string, { query: { enabled: !!id } });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustReason, setAdjustReason] = useState("");

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

  if (isLoading) return <div className="p-4 text-center mt-10">Loading...</div>;
  if (!data) return <div className="p-4 text-center mt-10">User not found</div>;

  const { user, recentTrades, recentTransactions } = data;

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustAmount || !adjustReason || isNaN(Number(adjustAmount))) return;
    adjustBalance.mutate({
      id: id as string,
      data: { amount: Number(adjustAmount), type: adjustType, reason: adjustReason }
    });
  };

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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="font-bold text-xl">${user.balance.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Deposited</div>
              <div className="font-medium">${user.totalDeposited.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Profit</div>
              <div className="font-medium text-primary">${user.totalProfit.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Loss</div>
              <div className="font-medium text-destructive">${user.totalLoss.toFixed(2)}</div>
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

      {recentTrades.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Trades</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentTrades.map(trade => (
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
                  <div className="text-sm font-medium">${trade.amount.toFixed(2)}</div>
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
            {recentTransactions.map(tx => (
              <div key={tx.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium capitalize">{tx.type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d, HH:mm")}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">${tx.amount.toFixed(2)}</div>
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
