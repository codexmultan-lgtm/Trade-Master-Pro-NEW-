import { useState } from "react";
import { useGetWallet, useRequestDeposit, useRequestWithdrawal, useGetTransactions, getGetWalletQueryKey, getGetTransactionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR } from "@/lib/currency";

const PAYMENT_METHODS = [
  { value: "easypaisa",     label: "EasyPaisa" },
  { value: "jazzcash",      label: "JazzCash" },
  { value: "sadapay",       label: "SadaPay" },
  { value: "nayapay",       label: "NayaPay" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "crypto",        label: "Crypto" },
];

const MOBILE_METHODS = new Set(["easypaisa", "jazzcash", "sadapay", "nayapay"]);

function getMethodLabel(v: string) {
  return PAYMENT_METHODS.find(m => m.value === v)?.label ?? v;
}

export default function Wallet() {
  const { data: wallet, isLoading: walletLoading } = useGetWallet();
  const { data: txData, isLoading: txLoading } = useGetTransactions({ limit: 50 });

  const [depAmount, setDepAmount] = useState("");
  const [depMethod, setDepMethod] = useState("easypaisa");
  const [depPhone, setDepPhone] = useState("");

  const [wdAmount, setWdAmount] = useState("");
  const [wdMethod, setWdMethod] = useState("easypaisa");
  const [wdAccount, setWdAccount] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deposit = useRequestDeposit({
    mutation: {
      onSuccess: () => {
        toast({ title: "Deposit request submitted", description: "Admin will review and credit your account." });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
        setDepAmount(""); setDepPhone("");
      },
      onError: (err: any) => toast({ title: "Deposit failed", description: err.message, variant: "destructive" }),
    }
  });

  const withdraw = useRequestWithdrawal({
    mutation: {
      onSuccess: () => {
        toast({ title: "Withdrawal request submitted", description: "Admin will process your withdrawal." });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
        setWdAmount(""); setWdAccount("");
      },
      onError: (err: any) => toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" }),
    }
  });

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depAmount || isNaN(Number(depAmount))) return;
    deposit.mutate({
      data: {
        amount: Number(depAmount),
        method: depMethod as any,
        notes: MOBILE_METHODS.has(depMethod) && depPhone ? `Sender: ${depPhone}` : undefined,
      }
    });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wdAmount || isNaN(Number(wdAmount)) || !wdAccount) return;
    withdraw.mutate({ data: { amount: Number(wdAmount), method: wdMethod as any, accountDetails: wdAccount } });
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/30 border-emerald-500/20">
        <CardContent className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-1">Available Balance</div>
          <div className="text-4xl font-bold text-emerald-400">
            {walletLoading ? "..." : formatPKR(wallet?.balance ?? 0)}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground">Total Deposited</div>
              <div className="font-semibold">{formatPKR(wallet?.totalDeposited ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Withdrawn</div>
              <div className="font-semibold">{formatPKR(wallet?.totalWithdrawn ?? 0)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit / Withdraw Tabs */}
      <Tabs defaultValue="deposit">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>

        <TabsContent value="deposit">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Funds</CardTitle>
              <CardDescription>Add PKR to your account via Pakistani payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDeposit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (₨ PKR)</Label>
                  <Input type="number" placeholder="5000" value={depAmount}
                    onChange={e => setDepAmount(e.target.value)} required min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={depMethod} onValueChange={setDepMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {MOBILE_METHODS.has(depMethod) && (
                  <div className="space-y-2">
                    <Label>Your {getMethodLabel(depMethod)} Number</Label>
                    <Input type="tel" placeholder="03XX-XXXXXXX" value={depPhone}
                      onChange={e => setDepPhone(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Send payment from your {getMethodLabel(depMethod)} and provide the number used.
                    </p>
                  </div>
                )}
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" type="submit" disabled={deposit.isPending}>
                  {deposit.isPending ? "Submitting..." : "Submit Deposit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw">
          <Card>
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
              <CardDescription>Withdraw PKR to your payment account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (₨ PKR)</Label>
                  <Input type="number" placeholder="1000" value={wdAmount}
                    onChange={e => setWdAmount(e.target.value)} required min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Withdrawal Method</Label>
                  <Select value={wdMethod} onValueChange={setWdMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {MOBILE_METHODS.has(wdMethod)
                      ? `${getMethodLabel(wdMethod)} Account / Phone Number`
                      : wdMethod === "crypto" ? "Wallet Address" : "Bank Account / IBAN"}
                  </Label>
                  <Input
                    placeholder={
                      MOBILE_METHODS.has(wdMethod) ? "03XX-XXXXXXX"
                      : wdMethod === "crypto" ? "Your wallet address"
                      : "PK00XXXX0000000000000000"
                    }
                    value={wdAccount}
                    onChange={e => setWdAccount(e.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={withdraw.isPending}>
                  {withdraw.isPending ? "Submitting..." : "Submit Withdrawal Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction History */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Transaction History</h2>
        {txLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : txData?.transactions.length ? (
          <div className="space-y-3">
            {txData.transactions.map((tx) => (
              <Card key={tx.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium capitalize">{tx.type.replace(/_/g, " ")}</div>
                  {tx.method && <div className="text-xs text-primary/80">{getMethodLabel(tx.method)}</div>}
                  <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="font-bold">{formatPKR(tx.amount)}</div>
                  <Badge
                    variant={tx.status === "approved" ? "default" : tx.status === "rejected" ? "destructive" : "secondary"}
                    className={tx.status === "approved" ? "bg-primary" : ""}
                  >
                    {tx.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-8">No transactions yet.</div>
        )}
      </div>
    </div>
  );
}
