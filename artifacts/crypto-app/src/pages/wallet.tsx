import { useState, useEffect } from "react";
import {
  useGetWallet, useRequestDeposit, useRequestWithdrawal, useGetTransactions,
  useGetWithdrawalAccount, useUpdateWithdrawalAccount,
  getGetWalletQueryKey, getGetTransactionsQueryKey, getGetWithdrawalAccountQueryKey,
} from "@workspace/api-client-react";
import { formatAmount } from "@/lib/currency";
import { usePlatformSettings } from "@/contexts/PlatformSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Info, Ban, Wallet2, BadgeIndianRupee, CircleDollarSign, Building2, Check, ArrowRight } from "lucide-react";


const METHOD_LABELS: Record<string, string> = {
  easypaisa: "EasyPaisa", jazzcash: "JazzCash", sadapay: "SadaPay",
  nayapay: "NayaPay", bank_transfer: "Bank Transfer", crypto: "Crypto",
};
function getMethodLabel(v: string) { return METHOD_LABELS[v] ?? v; }

type WdCurrency = "INR" | "PKR" | "USDT";

const CURRENCY_OPTIONS: { value: WdCurrency; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "INR", label: "INR", icon: <BadgeIndianRupee className="w-5 h-5" />, desc: "Indian Rupee" },
  { value: "PKR", label: "PKR", icon: <Building2 className="w-5 h-5" />, desc: "Pakistani Rupee" },
  { value: "USDT", label: "USDT", icon: <CircleDollarSign className="w-5 h-5" />, desc: "Tether (Crypto)" },
];

export default function Wallet() {
  const { currencySymbol, currency } = usePlatformSettings();
  const { user } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useGetWallet();
  const { data: txData, isLoading: txLoading } = useGetTransactions({ limit: 50 });
  const { data: savedAccount, isLoading: accountLoading } = useGetWithdrawalAccount({
    query: { queryKey: getGetWithdrawalAccountQueryKey() },
  });

  const [depAmount, setDepAmount] = useState("");

  const [wdAmount, setWdAmount] = useState("");

  // Withdrawal account form state
  const [waCurrency, setWaCurrency] = useState<WdCurrency>("PKR");
  // INR fields
  const [inrHolder, setInrHolder] = useState("");
  const [inrName, setInrName] = useState("");
  const [inrIFSC, setInrIFSC] = useState("");
  // PKR fields
  const [pkrTitle, setPkrTitle] = useState("");
  const [pkrNumber, setPkrNumber] = useState("");
  const [pkrHolderName, setPkrHolderName] = useState("");
  // USDT fields
  const [usdtAddress, setUsdtAddress] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pre-fill form when saved account loads
  useEffect(() => {
    if (!savedAccount || !savedAccount.currency) return;
    const c = savedAccount.currency as WdCurrency;
    setWaCurrency(c);
    if (c === "INR") {
      setInrHolder(savedAccount.accountHolder ?? "");
      setInrName(savedAccount.accountName ?? "");
      setInrIFSC(savedAccount.ifscNumber ?? "");
    } else if (c === "PKR") {
      setPkrTitle(savedAccount.accountTitle ?? "");
      setPkrNumber(savedAccount.accountNumber ?? "");
      setPkrHolderName(savedAccount.accountHolderName ?? "");
    } else if (c === "USDT") {
      setUsdtAddress(savedAccount.walletAddress ?? "");
    }
  }, [savedAccount]);

  const fmt = (n: number) => formatAmount(n, currencySymbol);

  const deposit = useRequestDeposit({
    mutation: {
      onSuccess: () => {
        toast({ title: "Deposit request submitted", description: "Admin will review and credit your account." });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
        setDepAmount("");
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
        setWdAmount("");
      },
      onError: (err: any) => toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" }),
    }
  });

  const updateAccount = useUpdateWithdrawalAccount({
    mutation: {
      onSuccess: () => {
        toast({ title: "Account saved", description: "Your withdrawal account has been updated." });
        queryClient.invalidateQueries({ queryKey: getGetWithdrawalAccountQueryKey() });
      },
      onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
    }
  });

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depAmount || isNaN(Number(depAmount)) || !savedAccount?.currency) return;
    deposit.mutate({
      data: {
        amount: Number(depAmount),
        method: getAccountMethod(savedAccount) as any,
        notes: getAccountDetails(savedAccount),
      }
    });
  };

  function getAccountMethod(acc: typeof savedAccount): string {
    if (!acc) return "bank_transfer";
    if (acc.currency === "USDT") return "crypto";
    return "bank_transfer";
  }

  function getAccountDetails(acc: typeof savedAccount): string {
    if (!acc) return "";
    if (acc.currency === "INR") return `INR | ${acc.accountHolder} | ${acc.accountName} | IFSC: ${acc.ifscNumber}`;
    if (acc.currency === "PKR") return `PKR | ${acc.accountHolderName} | ${acc.accountTitle} | Acc: ${acc.accountNumber}`;
    if (acc.currency === "USDT") return `USDT | ${acc.walletAddress}`;
    return "";
  }

  function getAccountIcon(currency?: string | null) {
    if (currency === "INR") return <BadgeIndianRupee className="w-5 h-5 text-primary" />;
    if (currency === "USDT") return <CircleDollarSign className="w-5 h-5 text-primary" />;
    return <Building2 className="w-5 h-5 text-primary" />;
  }

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wdAmount || isNaN(Number(wdAmount)) || !savedAccount?.currency) return;
    withdraw.mutate({
      data: {
        amount: Number(wdAmount),
        method: getAccountMethod(savedAccount) as any,
        accountDetails: getAccountDetails(savedAccount),
      }
    });
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { currency: waCurrency };
    if (waCurrency === "INR") {
      payload.accountHolder = inrHolder;
      payload.accountName = inrName;
      payload.ifscNumber = inrIFSC;
    } else if (waCurrency === "PKR") {
      payload.accountTitle = pkrTitle;
      payload.accountNumber = pkrNumber;
      payload.accountHolderName = pkrHolderName;
    } else {
      payload.walletAddress = usdtAddress;
    }
    updateAccount.mutate({ data: payload });
  };

  const isAccountSaved = !!savedAccount?.currency;

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/30 border-emerald-500/20">
        <CardContent className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-1">Available Balance</div>
          <div className="text-4xl font-bold text-emerald-400">
            {walletLoading ? "..." : fmt(wallet?.balance ?? 0)}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground">Total Deposited</div>
              <div className="font-semibold">{fmt(wallet?.totalDeposited ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Withdrawn</div>
              <div className="font-semibold">{fmt(wallet?.totalWithdrawn ?? 0)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="deposit">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="account" className="relative">
            Account
            {isAccountSaved && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── DEPOSIT ── */}
        <TabsContent value="deposit">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Funds</CardTitle>
              <CardDescription>Funds will be received from your saved account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading account...</div>
              ) : !isAccountSaved ? (
                /* No account saved — prompt */
                <div className="rounded-xl border-2 border-dashed border-border p-6 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Wallet2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">No account saved yet</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Add your account in the Account tab before requesting a deposit.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const trigger = document.querySelector<HTMLElement>('[value="account"]');
                      trigger?.click();
                    }}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Go to Account tab <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* Account exists — show card + amount */
                <form onSubmit={handleDeposit} className="space-y-4">
                  {/* Saved account card */}
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                      Sending From
                    </Label>
                    <div className="flex items-start gap-3 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4">
                      <div className="mt-0.5 shrink-0">
                        {getAccountIcon(savedAccount?.currency)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            {savedAccount?.currency}
                          </span>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-medium">Verified</span>
                        </div>
                        {savedAccount?.currency === "INR" && (
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold">{savedAccount.accountHolder}</div>
                            <div className="text-xs text-muted-foreground">{savedAccount.accountName}</div>
                            <div className="text-xs font-mono text-muted-foreground">IFSC: {savedAccount.ifscNumber}</div>
                          </div>
                        )}
                        {savedAccount?.currency === "PKR" && (
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold">{savedAccount.accountHolderName}</div>
                            <div className="text-xs text-muted-foreground">{savedAccount.accountTitle}</div>
                            <div className="text-xs font-mono text-muted-foreground">{savedAccount.accountNumber}</div>
                          </div>
                        )}
                        {savedAccount?.currency === "USDT" && (
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold">Crypto Wallet</div>
                            <div className="text-xs font-mono text-muted-foreground break-all">{savedAccount.walletAddress}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label>Amount ({currencySymbol} {currency})</Label>
                    <Input
                      type="number"
                      placeholder="5000"
                      value={depAmount}
                      onChange={e => setDepAmount(e.target.value)}
                      required
                      min="1"
                    />
                  </div>

                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" type="submit" disabled={deposit.isPending}>
                    {deposit.isPending ? "Submitting..." : "Submit Deposit Request"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WITHDRAW ── */}
        <TabsContent value="withdraw">
          <Card className={user?.withdrawalBanned ? "border-destructive/50" : ""}>
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
              <CardDescription>Funds will be sent to your saved payout account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Banned state */}
              {user?.withdrawalBanned ? (
                <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <Ban className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-destructive mb-1">Withdrawals Disabled</div>
                    <div className="text-sm text-muted-foreground">
                      {user.withdrawalBanReason || "Withdrawals have been disabled for your account by an admin."}
                    </div>
                  </div>
                </div>
              ) : accountLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading account...</div>
              ) : !isAccountSaved ? (
                /* No account saved — prompt to add one */
                <div className="rounded-xl border-2 border-dashed border-border p-6 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Wallet2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">No payout account saved</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Add your withdrawal account in the Account tab before requesting a withdrawal.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const trigger = document.querySelector<HTMLElement>('[data-state][value="account"]');
                      trigger?.click();
                    }}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Go to Account tab <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* Account exists — show it and amount form */
                <form onSubmit={handleWithdraw} className="space-y-4">
                  {/* Saved account card */}
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                      Payout Account
                    </Label>
                    <div className="flex items-start gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
                      <div className="mt-0.5 shrink-0">
                        {getAccountIcon(savedAccount?.currency)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                            {savedAccount?.currency}
                          </span>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-medium">Verified</span>
                        </div>
                        {savedAccount?.currency === "INR" && (
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold">{savedAccount.accountHolder}</div>
                            <div className="text-xs text-muted-foreground">{savedAccount.accountName}</div>
                            <div className="text-xs font-mono text-muted-foreground">IFSC: {savedAccount.ifscNumber}</div>
                          </div>
                        )}
                        {savedAccount?.currency === "PKR" && (
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold">{savedAccount.accountHolderName}</div>
                            <div className="text-xs text-muted-foreground">{savedAccount.accountTitle}</div>
                            <div className="text-xs font-mono text-muted-foreground">{savedAccount.accountNumber}</div>
                          </div>
                        )}
                        {savedAccount?.currency === "USDT" && (
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold">Crypto Wallet</div>
                            <div className="text-xs font-mono text-muted-foreground break-all">{savedAccount.walletAddress}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label>Amount ({currencySymbol} {currency})</Label>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={wdAmount}
                      onChange={e => setWdAmount(e.target.value)}
                      required
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: <span className="font-semibold text-foreground">{fmt(wallet?.balance ?? 0)}</span>
                    </p>
                  </div>

                  <Button className="w-full" type="submit" disabled={withdraw.isPending}>
                    {withdraw.isPending ? "Submitting..." : "Submit Withdrawal Request"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WITHDRAWAL ACCOUNT ── */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet2 className="w-5 h-5 text-primary" />
                    Withdrawal Account
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Save your payout account so admin can process withdrawals
                  </CardDescription>
                </div>
                {isAccountSaved && (
                  <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 shrink-0">
                    <Check className="w-3 h-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {accountLoading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
              ) : (
                <form onSubmit={handleSaveAccount} className="space-y-5">

                  {/* Currency Selector */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Select Currency</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {CURRENCY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setWaCurrency(opt.value)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                            waCurrency === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {opt.icon}
                          <span className="text-xs font-bold">{opt.label}</span>
                          <span className="text-[10px] text-center leading-tight opacity-70">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── INR Fields ── */}
                  {waCurrency === "INR" && (
                    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <BadgeIndianRupee className="w-4 h-4 text-primary" />
                        Indian Bank Account Details
                      </div>
                      <div className="space-y-2">
                        <Label>Account Holder</Label>
                        <Input
                          placeholder="Full name as on bank records"
                          value={inrHolder}
                          onChange={e => setInrHolder(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input
                          placeholder="Bank account name / nickname"
                          value={inrName}
                          onChange={e => setInrName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IFSC Number</Label>
                        <Input
                          placeholder="e.g. SBIN0001234"
                          value={inrIFSC}
                          onChange={e => setInrIFSC(e.target.value.toUpperCase())}
                          required
                          maxLength={11}
                          className="font-mono tracking-wide"
                        />
                        <p className="text-xs text-muted-foreground">11-character IFSC code from your bank passbook or cheque</p>
                      </div>
                    </div>
                  )}

                  {/* ── PKR Fields ── */}
                  {waCurrency === "PKR" && (
                    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Building2 className="w-4 h-4 text-primary" />
                        Pakistani Bank / Wallet Account Details
                      </div>
                      <div className="space-y-2">
                        <Label>Account Title</Label>
                        <Input
                          placeholder="e.g. EasyPaisa / HBL Bank"
                          value={pkrTitle}
                          onChange={e => setPkrTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          placeholder="e.g. 03XX-XXXXXXX or IBAN"
                          value={pkrNumber}
                          onChange={e => setPkrNumber(e.target.value)}
                          required
                          className="font-mono tracking-wide"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input
                          placeholder="Full name as registered"
                          value={pkrHolderName}
                          onChange={e => setPkrHolderName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* ── USDT Fields ── */}
                  {waCurrency === "USDT" && (
                    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CircleDollarSign className="w-4 h-4 text-primary" />
                        USDT Wallet Details
                      </div>
                      <div className="space-y-2">
                        <Label>Wallet Address</Label>
                        <Input
                          placeholder="TRC20 / ERC20 wallet address"
                          value={usdtAddress}
                          onChange={e => setUsdtAddress(e.target.value)}
                          required
                          className="font-mono text-xs tracking-wide"
                        />
                        <p className="text-xs text-muted-foreground">
                          Double-check your address — crypto transfers cannot be reversed.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Saved account preview */}
                  {isAccountSaved && savedAccount.currency === waCurrency && (
                    <div className="flex items-start gap-3 rounded-lg bg-emerald-900/20 border border-emerald-500/25 p-3">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-300 leading-relaxed">
                        <span className="font-semibold block mb-0.5">Currently saved ({savedAccount.currency})</span>
                        {savedAccount.currency === "INR" && (
                          <span>{savedAccount.accountHolder} · {savedAccount.accountName} · {savedAccount.ifscNumber}</span>
                        )}
                        {savedAccount.currency === "PKR" && (
                          <span>{savedAccount.accountHolderName} · {savedAccount.accountTitle} · {savedAccount.accountNumber}</span>
                        )}
                        {savedAccount.currency === "USDT" && (
                          <span className="font-mono break-all">{savedAccount.walletAddress}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={updateAccount.isPending}>
                    {updateAccount.isPending ? "Saving..." : isAccountSaved ? "Update Withdrawal Account" : "Save Withdrawal Account"}
                  </Button>
                </form>
              )}
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
              <Card
                key={tx.id}
                className={`overflow-hidden ${
                  tx.status === "rejected"
                    ? "border-destructive/40"
                    : tx.status === "approved"
                    ? "border-primary/30"
                    : "border-border"
                }`}
              >
                {/* Status colour bar */}
                <div className={`h-1 w-full ${
                  tx.status === "approved" ? "bg-primary" :
                  tx.status === "rejected" ? "bg-destructive" : "bg-muted"
                }`} />
                <CardContent className="p-4 space-y-3">
                  {/* Main row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium capitalize">{tx.type.replace(/_/g, " ")}</div>
                      {tx.method && (
                        <div className="text-xs text-primary/80">{getMethodLabel(tx.method)}</div>
                      )}
                      <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="font-bold text-base">{fmt(tx.amount)}</div>
                      <Badge
                        variant={tx.status === "approved" ? "default" : tx.status === "rejected" ? "destructive" : "secondary"}
                        className={tx.status === "approved" ? "bg-primary" : ""}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Admin note on approved transactions */}
                  {tx.status === "approved" && tx.notes && (
                    <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-lg p-3">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-primary mb-0.5">Admin Note</div>
                        <div className="text-sm">{tx.notes}</div>
                      </div>
                    </div>
                  )}

                  {/* Rejection reason */}
                  {tx.status === "rejected" && tx.rejectionReason && (
                    <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                      <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-destructive mb-0.5">Reason for Rejection</div>
                        <div className="text-sm">{tx.rejectionReason}</div>
                      </div>
                    </div>
                  )}

                  {/* Pending hint */}
                  {tx.status === "pending" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      Under review — admin will process your request shortly.
                    </div>
                  )}
                </CardContent>
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
