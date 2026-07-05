import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { useListCandles, useGetCurrentPrice, usePlaceTrade, useGetActiveTrades, getGetActiveTradesQueryKey, useGetWallet, getGetWalletQueryKey, Candle } from "@workspace/api-client-react";
import { formatMarketPrice } from "@/lib/currency";
import { symbolToDisplay, getQuoteAsset } from "@/lib/symbols";
import { usePlatformSettings } from "@/contexts/PlatformSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { CandleChart } from "@/components/CandleChart";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, Ban } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

export default function TradePage() {
  const { symbol } = useParams();
  const { user } = useAuth();
  const { currencySymbol, minTradeAmount, maxTradeAmount, profit60s, profit120s, profit180s, profit240s } = usePlatformSettings();
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [tradeDirection, setTradeDirection] = useState<'up' | 'down'>('up');
  const [amount, setAmount] = useState(String(minTradeAmount));
  const [duration, setDuration] = useState("60");

  const quickPicks = useMemo(() => {
    const min = minTradeAmount;
    const max = maxTradeAmount;
    const picks = [min, min * 2, min * 5, min * 10].filter(v => v <= max);
    if (picks.length < 4 && picks[picks.length - 1] !== max) picks.push(max);
    return picks.slice(0, 4).map(String);
  }, [minTradeAmount, maxTradeAmount]);

  const profitMap: Record<string, number> = { "60": profit60s, "120": profit120s, "180": profit180s, "240": profit240s };

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { subscribe } = useSocket();

  const { data: initialCandles } = useListCandles(symbol as any, undefined, { query: { enabled: !!symbol, queryKey: ['candles', symbol] as const } });
  const { data: priceData } = useGetCurrentPrice(symbol as any, { query: { enabled: !!symbol, queryKey: ['price', symbol] as const } });
  const { data: activeTrades } = useGetActiveTrades();
  
  const placeTrade = usePlaceTrade({
    mutation: {
      onSuccess: () => {
        toast({ title: "Trade placed successfully" });
        setIsSheetOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetActiveTradesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to place trade", description: err.message, variant: "destructive" });
      }
    }
  });

  useEffect(() => {
    setAmount(String(minTradeAmount));
  }, [minTradeAmount]);

  useEffect(() => {
    if (initialCandles) {
      setCandles(initialCandles);
    }
  }, [initialCandles]);

  useEffect(() => {
    if (priceData) {
      setCurrentPrice(priceData.price);
    }
  }, [priceData]);

  useEffect(() => {
    const unsubPrice = subscribe("price_update", (data) => {
      if (data.symbol === symbol) {
        setCurrentPrice(data.price);
      }
    });

    const unsubCandle = subscribe("candle_update", (data) => {
      if (data.symbol === symbol) {
        setCandles(prev => {
          const last = prev[prev.length - 1];
          if (last && last.time === data.candle.time) {
            const newArr = [...prev];
            newArr[newArr.length - 1] = data.candle;
            return newArr;
          }
          return [...prev, data.candle];
        });
      }
    });

    const unsubTrade = subscribe("trade_settled", (data) => {
      queryClient.invalidateQueries({ queryKey: getGetActiveTradesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      const pl = data.profitLoss as number;
      toast({
        title: `Trade ${data.result.toUpperCase()}`,
        description: `Trade settled. P&L: ${currencySymbol}${Math.abs(pl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        variant: pl > 0 ? "default" : "destructive"
      });
    });

    return () => {
      unsubPrice();
      unsubCandle();
      unsubTrade();
    };
  }, [symbol, subscribe, queryClient, toast]);

  const openTradeSheet = (direction: 'up' | 'down') => {
    if (user?.tradeBanned) return;
    setTradeDirection(direction);
    setIsSheetOpen(true);
  };

  const handlePlaceTrade = () => {
    if (!symbol || !amount || isNaN(Number(amount))) return;
    placeTrade.mutate({
      data: {
        symbol: symbol as any,
        direction: tradeDirection,
        amount: Number(amount),
        duration: Number(duration) as any
      }
    });
  };

  const symbolActiveTrades = (Array.isArray(activeTrades) ? activeTrades : []).filter(t => t.symbol === symbol);

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="p-4 border-b border-border flex justify-between items-center bg-card">
        <h1 className="text-xl font-bold tracking-tight">{symbolToDisplay(symbol ?? "")}</h1>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {currentPrice
              ? formatMarketPrice(currentPrice, getQuoteAsset(symbol ?? "BTCUSDT"))
              : "---"}
          </div>
        </div>
      </div>

      <div style={{ height: "320px", flexShrink: 0 }} className="w-full relative bg-[#0d1117]">
        <CandleChart data={candles} symbol={symbol!} />
      </div>

      {symbolActiveTrades.length > 0 && (
        <div className="p-4 bg-card/80 border-y border-border overflow-x-auto whitespace-nowrap flex gap-3">
          {symbolActiveTrades.map(trade => (
            <div key={trade.id} className="inline-block border border-border bg-background p-3 rounded-lg min-w-[200px]">
              <div className="flex justify-between items-center mb-1">
                <span className={`flex items-center text-xs font-bold ${trade.direction === 'up' ? 'text-primary' : 'text-destructive'}`}>
                  {trade.direction === 'up' ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                  {currencySymbol}{trade.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-muted-foreground">
                  Entry: {formatMarketPrice(trade.entryPrice, getQuoteAsset(symbol ?? "BTCUSDT"))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {user?.tradeBanned ? (
        <div className="p-4 bg-background border-t border-border mt-auto">
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <Ban className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-destructive mb-1">Trading Disabled</div>
              <div className="text-sm text-muted-foreground">
                {user.tradeBanReason || "Trading has been disabled for your account by an admin."}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 gap-4 bg-background border-t border-border mt-auto">
          <Button 
            className="h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            onClick={() => openTradeSheet('up')}
          >
            <ArrowUp className="mr-2" /> BUY UP
          </Button>
          <Button 
            className="h-14 text-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            onClick={() => openTradeSheet('down')}
          >
            <ArrowDown className="mr-2" /> BUY DOWN
          </Button>
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>{tradeDirection === 'up' ? 'BUY UP ▲' : 'BUY DOWN ▼'}</span>
              <span className="text-muted-foreground">{symbol}</span>
            </SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-6">
            <Tabs value={duration} onValueChange={setDuration}>
              <TabsList className="grid grid-cols-4 w-full h-10">
                <TabsTrigger value="60">60s</TabsTrigger>
                <TabsTrigger value="120">120s</TabsTrigger>
                <TabsTrigger value="180">180s</TabsTrigger>
                <TabsTrigger value="240">240s</TabsTrigger>
              </TabsList>
              <div className="text-center mt-2 text-sm font-medium text-accent">
                Profit: {profitMap[duration]}%
              </div>
            </Tabs>

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Investment Amount</label>
              <div className="flex gap-2">
                {quickPicks.map(val => (
                  <Button 
                    key={val} 
                    variant={amount === val ? "default" : "outline"} 
                    className="flex-1 text-xs"
                    onClick={() => setAmount(val)}
                  >
                    {currencySymbol}{Number(val).toLocaleString()}
                  </Button>
                ))}
              </div>
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                min={minTradeAmount}
                max={maxTradeAmount}
                className="text-center text-lg font-bold h-12"
              />
              <p className="text-xs text-muted-foreground text-center">
                Min: {currencySymbol}{minTradeAmount.toLocaleString()} — Max: {currencySymbol}{maxTradeAmount.toLocaleString()}
              </p>
            </div>

            <Button 
              className={`w-full h-14 text-lg font-bold ${tradeDirection === 'up' ? 'bg-primary hover:bg-primary/90' : 'bg-destructive hover:bg-destructive/90'}`}
              onClick={handlePlaceTrade}
              disabled={placeTrade.isPending}
            >
              {placeTrade.isPending ? "PROCESSING..." : "CONFIRM"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
