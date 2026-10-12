import { useGetMarkets } from "@workspace/api-client-react";
import { formatMarketPrice, formatPKR } from "@/lib/currency";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { TrendingUp, TrendingDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import "./trade-responsive.css";

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
    return (
      <div className="trade-markets-page" aria-label="Loading markets">
        <div className="trade-markets-heading space-y-4">
          <div className="h-8 w-32 rounded-md bg-muted animate-pulse" />
          <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
        </div>
        <div className="trade-markets-list">
          <div className="trade-market-skeleton" />
          <div className="trade-market-skeleton" />
          <div className="trade-market-skeleton" />
        </div>
      </div>
    );
  }

  const filteredMarkets = Object.values(markets).filter(m => 
    m.symbol.toLowerCase().includes(search.toLowerCase()) || 
    m.baseAsset.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="trade-markets-page">
      <div className="trade-markets-heading space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Markets</h1>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search pairs..." 
            className="trade-markets-search pl-9 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="trade-markets-list">
        {filteredMarkets.length > 0 ? filteredMarkets.map(market => {
          const isPositive = market.change24h >= 0;
          return (
            <Link key={market.symbol} href={`/trade/${market.symbol}`} className="trade-market-link">
              <Card className="bg-card border-border hover:bg-accent/5 transition-colors cursor-pointer">
                <CardContent className="trade-market-row flex items-center justify-between gap-3">
                  <div className="trade-market-identity flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                      {market.baseAsset.substring(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="trade-market-name font-bold">{market.baseAsset}/{market.quoteAsset}</div>
                      <div className="text-xs text-muted-foreground">Vol {market.volume24h?.toFixed(0) || "0"}</div>
                    </div>
                  </div>
                  
                  <div className="trade-market-quote text-right">
                    <div className="font-bold">{formatMarketPrice(market.lastPrice ?? 0, market.quoteAsset)}</div>
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
          <div className="trade-market-empty text-center text-muted-foreground">No markets found</div>
        )}
      </div>
    </div>
  );
}
