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

export default function Wallet() {
  const { data: wallet, isLoading: walletLoading } = useGetWallet();
  const { data: txData, isLoading: txLoading } = useGetTransactions({ limit: 50 });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [accountDetails, setAccountDetails] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deposit = useRequestDeposit({
    mutation: {
      onSuccess: () => {
        toast({ title: "Deposit requested successfully" });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
        setAmount("");
      },
      onError: (err: any) => {
        toast({ title: "Deposit failed", description: err.message, variant: "destructive" });
      }
    }
  });

  const withdraw = useRequestWithdrawal({
    mutation: {
      onSuccess: () => {
        toast({ title: "Withdrawal requested successfully" });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
        setAmount("");
        setAccountDetails("");
      },
      onError: (err: any) => {
        toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
      }
    }
  });

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    deposit.mutate({ data: { amount: Number(amount), method: method as any } });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !accountDetails) return;
    withdraw.mutate({ data: { amount: Number(amount), method: method as any, accountDetails } });
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
      
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-1">Available Balance</div>
          <div className="text-4xl font-bold">${wallet?.balance?.toFixed(2) || "0.00"}</div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground">Total Deposited</div>
              <div className="font-medium">${wallet?.totalDeposited?.toFixed(2) || "0.00"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Withdrawn</div>
              <div className="font-medium">${wallet?.totalWithdrawn?.toFixed(2) || "0.00"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="deposit">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>
        <TabsContent value="deposit">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Funds</CardTitle>
              <CardDescription>Add funds to your demo trading account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDeposit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <Input type="number" placeholder="1000" value={amount} onChange={e => setAmount(e.target.value)} required min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" type="submit" disabled={deposit.isPending}>
                  {deposit.isPending ? "Processing..." : "Submit Deposit"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="withdraw">
          <Card>
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
              <CardDescription>Withdraw funds from your demo account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <Input type="number" placeholder="100" value={amount} onChange={e => setAmount(e.target.value)} required min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Account Details</Label>
                  <Input placeholder="Enter wallet address or bank account" value={accountDetails} onChange={e => setAccountDetails(e.target.value)} required />
                </div>
                <Button className="w-full" type="submit" disabled={withdraw.isPending}>
                  {withdraw.isPending ? "Processing..." : "Submit Withdrawal"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Transaction History</h2>
        {txLoading ? (
          <div>Loading...</div>
        ) : txData?.transactions.length ? (
          <div className="space-y-3">
            {txData.transactions.map((tx) => (
              <Card key={tx.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium capitalize">{tx.type.replace('_', ' ')}</div>
                  <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="font-bold">${tx.amount.toFixed(2)}</div>
                  <Badge variant={tx.status === 'approved' ? 'default' : tx.status === 'rejected' ? 'destructive' : 'secondary'} className={tx.status === 'approved' ? 'bg-primary' : ''}>
                    {tx.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-8">No transactions found.</div>
        )}
      </div>
    </div>
  );
}
