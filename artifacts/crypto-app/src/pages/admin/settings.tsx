import { useState, useEffect } from "react";
import {
  useGetAdminPlatformSettings,
  useUpdatePlatformSettings,
  getGetAdminPlatformSettingsQueryKey,
  useGetTradeSettings,
  useSetTradeSetting,
  getGetTradeSettingsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, DollarSign, TrendingUp, BarChart3, Zap, Globe } from "lucide-react";
import { ALL_SYMBOLS, symbolToDisplay } from "@/lib/symbols";

const CURRENCIES = [
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "USD", symbol: "$",  name: "US Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

const OUTCOME_OPTIONS = [
  { value: "auto", label: "AUTO" },
  { value: "win",  label: "WIN"  },
  { value: "loss", label: "LOSS" },
] as const;

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetAdminPlatformSettings();
  const { data: tradeSettings, isLoading: tradeLoading } = useGetTradeSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currency, setCurrency]         = useState("PKR");
  const [profit60s, setProfit60s]       = useState(85);
  const [profit120s, setProfit120s]     = useState(80);
  const [profit180s, setProfit180s]     = useState(75);
  const [profit240s, setProfit240s]     = useState(70);
  const [lossPercent, setLossPercent]   = useState(100);
  const [minTrade, setMinTrade]         = useState(100);
  const [maxTrade, setMaxTrade]         = useState(100000);
  const [enabledSymbols, setEnabledSymbols] = useState<string[]>([]);

  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency);
      setProfit60s(settings.profit60s);
      setProfit120s(settings.profit120s);
      setProfit180s(settings.profit180s);
      setProfit240s(settings.profit240s);
      setLossPercent(settings.lossPercent);
      setMinTrade(settings.minTradeAmount);
      setMaxTrade(settings.maxTradeAmount);
      setEnabledSymbols(settings.enabledSymbols);
    }
  }, [settings]);

  const update = useUpdatePlatformSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminPlatformSettingsQueryKey() });
        toast({ title: "Settings saved successfully" });
      },
      onError: (err: any) => toast({ title: "Failed to save", description: err.message, variant: "destructive" }),
    },
  });

  const setOutcome = useSetTradeSetting({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTradeSettingsQueryKey() });
        toast({ title: "Trade outcome updated" });
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    },
  });

  function handleSave() {
    update.mutate({
      data: {
        currency: currency as "PKR" | "USD" | "INR" | "GBP",
        profit60s, profit120s, profit180s, profit240s,
        lossPercent,
        minTradeAmount: minTrade,
        maxTradeAmount: maxTrade,
        enabledSymbols,
      },
    });
  }

  function toggleSymbol(sym: string) {
    setEnabledSymbols(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  }

  if (isLoading) return <div className="p-4 text-center mt-10">Loading settings...</div>;

  const profitFields = [
    { label: "60s Profit %",  value: profit60s,  setter: setProfit60s  },
    { label: "120s Profit %", value: profit120s, setter: setProfit120s },
    { label: "180s Profit %", value: profit180s, setter: setProfit180s },
    { label: "240s Profit %", value: profit240s, setter: setProfit240s },
  ] as const;

  return (
    <div className="p-4 space-y-5 pb-28">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Platform Settings
        </h1>
        <Button onClick={handleSave} disabled={update.isPending} className="h-9 px-5">
          {update.isPending ? "Saving..." : "Save All"}
        </Button>
      </div>

      {/* Currency */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Active Platform Currency
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Changes the currency symbol shown across the entire platform.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  currency === c.code
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className={`font-bold text-xl ${currency === c.code ? "text-primary" : ""}`}>
                  {c.symbol} {c.code}
                </div>
                <div className="text-xs text-muted-foreground">{c.name}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profit & Loss */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Profit & Loss Percentages
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Profit % is added to winning trade amounts. Loss % controls how much is deducted on a loss.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {profitFields.map(({ label, value, setter }) => (
              <div key={label}>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={value}
                    onChange={e => setter(Number(e.target.value))}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Loss % (of trade amount)</Label>
            <div className="flex items-center gap-3">
              <div className="relative w-36">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={lossPercent}
                  onChange={e => setLossPercent(Number(e.target.value))}
                  className="pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                100% = full loss · 50% = half refunded on loss
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trade Limits */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Trade Amount Limits
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Applies globally to all trading pairs.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Min Trade Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  value={minTrade}
                  onChange={e => setMinTrade(Number(e.target.value))}
                  className="pl-8"
                />
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">
                  {CURRENCIES.find(c => c.code === currency)?.symbol ?? "₨"}
                </span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Max Trade Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  value={maxTrade}
                  onChange={e => setMaxTrade(Number(e.target.value))}
                  className="pl-8"
                />
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">
                  {CURRENCIES.find(c => c.code === currency)?.symbol ?? "₨"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Trading Pairs */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Active Trading Pairs
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Disabled pairs cannot be traded by users.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="space-y-1">
            {ALL_SYMBOLS.map(sym => {
              const isEnabled = enabledSymbols.includes(sym);
              return (
                <div
                  key={sym}
                  className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0"
                >
                  <div>
                    <span className="font-mono font-bold text-sm">{symbolToDisplay(sym)}</span>
                    <span className="text-[11px] text-muted-foreground ml-2 font-mono">{sym}</span>
                  </div>
                  <button
                    onClick={() => toggleSymbol(sym)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      isEnabled ? "bg-primary" : "bg-muted"
                    }`}
                    aria-label={isEnabled ? "Disable" : "Enable"}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Trade Outcome Control */}
      <Card className="border-amber-500/30 bg-amber-950/10">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Trade Outcome Control
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            AUTO = settled by price direction. WIN / LOSS forces the result for all settling trades on that symbol.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {tradeLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-3">
              {(tradeSettings ?? []).map(s => (
                <div key={s.symbol} className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sm min-w-[90px]">
                    {symbolToDisplay(s.symbol)}
                  </span>
                  <div className="flex gap-1">
                    {OUTCOME_OPTIONS.map(opt => {
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

      <Button onClick={handleSave} disabled={update.isPending} className="w-full h-11">
        {update.isPending ? "Saving..." : "Save All Settings"}
      </Button>
    </div>
  );
}
