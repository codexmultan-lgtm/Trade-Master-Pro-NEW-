import { useGetMarkets } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { TrendingUp, TrendingDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TradeList() {
  const { data: initialMarkets, isLoading } = useGetMarkets();
  const [markets, setMarkets] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const { subscribe } = useSocket();

  useEffect(() => {
    if (initialMarkets) {
      const marketsMap = initialMarkets.reduce((acc, m) => {
        acc[m.symbol] = m;
        return acc;
      }, {} as Record<string, any>);
      setMarkets(marketsMap);
    }
  }, [initialMarkets]);

  useEffect(() => {
    const unsub = subscribe("price_update", (data) => {
      setMarkets(prev => {
        if (!prev[data.symbol]) return prev;
        return {
          ...prev,
          [data.symbol]: {
            ...prev[data.symbol],
            lastPrice: data.price,
            change24h: data.change24h !== undefined ? data.change24h : prev[data.symbol].change24h
          }
        };
      });
    });
    return unsub;
  }, [subscribe]);

  if (isLoading) {
    return <div className="p-4 text-center mt-10">Loading markets...</div>;
  }

  const filteredMarkets = Object.values(markets).filter(m => 
    m.symbol.toLowerCase().includes(search.toLowerCase()) || 
    m.baseAsset.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Markets</h1>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search pairs..." 
            className="pl-9 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 space-y-2">
        {filteredMarkets.length > 0 ? filteredMarkets.map(market => {
          const isPositive = market.change24h >= 0;
          return (
            <Link key={market.symbol} href={`/trade/${market.symbol}`}>
              <Card className="bg-card border-border hover:bg-accent/5 transition-colors cursor-pointer mb-2">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                      {market.baseAsset.substring(0, 3)}
                    </div>
                    <div>
                      <div className="font-bold">{market.baseAsset}/{market.quoteAsset}</div>
                      <div className="text-xs text-muted-foreground">Vol {market.volume24h?.toFixed(0) || "0"}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-lg">${market.lastPrice?.toFixed(2) || "0.00"}</div>
                    <div className={`text-xs flex items-center justify-end font-medium ${isPositive ? 'text-primary' : 'text-destructive'}`}>
                      {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {isPositive ? '+' : ''}{market.change24h?.toFixed(2) || "0.00"}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        }) : (
          <div className="text-center text-muted-foreground p-8">No markets found</div>
        )}
      </div>
    </div>
  );
}
