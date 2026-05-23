import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useListCandles, useGetCurrentPrice, usePlaceTrade, useGetActiveTrades, getGetActiveTradesQueryKey, useGetWallet, getGetWalletQueryKey, Candle } from "@workspace/api-client-react";
import { formatPKR, formatMarketPrice } from "@/lib/currency";
import { CandleChart } from "@/components/CandleChart";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

export default function TradePage() {
  const { symbol } = useParams();
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [tradeDirection, setTradeDirection] = useState<'up' | 'down'>('up');
  const [amount, setAmount] = useState("10");
  const [duration, setDuration] = useState("60");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { subscribe } = useSocket();

  const { data: initialCandles } = useListCandles(symbol as any, { query: { enabled: !!symbol } });
  const { data: priceData } = useGetCurrentPrice(symbol as any, { query: { enabled: !!symbol } });
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
      toast({
        title: `Trade ${data.result.toUpperCase()}`,
        description: `Trade settled. P&L: ${formatPKR(data.profitLoss)}`,
        variant: data.profitLoss > 0 ? "default" : "destructive"
      });
    });

    return () => {
      unsubPrice();
      unsubCandle();
      unsubTrade();
    };
  }, [symbol, subscribe, queryClient, toast]);

  const openTradeSheet = (direction: 'up' | 'down') => {
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
        <h1 className="text-xl font-bold tracking-tight">{symbol}</h1>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {currentPrice
              ? formatMarketPrice(currentPrice, symbol?.replace(/^(BTC|ETH|BNB)/, "") ?? "USDT")
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
                  {formatPKR(trade.amount)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Entry: {formatMarketPrice(trade.entryPrice, symbol?.replace(/^(BTC|ETH|BNB)/, "") ?? "USDT")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

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
                Profit: {duration === '60' ? '85%' : duration === '120' ? '80%' : duration === '180' ? '75%' : '70%'}
              </div>
            </Tabs>

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Investment Amount</label>
              <div className="flex gap-2">
                {['10', '25', '50', '100'].map(val => (
                  <Button 
                    key={val} 
                    variant={amount === val ? "default" : "outline"} 
                    className="flex-1"
                    onClick={() => setAmount(val)}
                  >
                    ${val}
                  </Button>
                ))}
              </div>
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                className="text-center text-lg font-bold h-12"
              />
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
