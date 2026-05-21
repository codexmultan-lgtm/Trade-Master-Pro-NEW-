import { useGetAdminTrades, useSetTradeResult, getGetAdminTradesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";

export default function AdminTrades() {
  const { data: tradesData, isLoading } = useGetAdminTrades({ limit: 50 });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const setResult = useSetTradeResult({
    mutation: {
      onSuccess: () => {
        toast({ title: "Trade result set successfully" });
        queryClient.invalidateQueries({ queryKey: getGetAdminTradesQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to set result", description: err.message, variant: "destructive" });
      }
    }
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">All Trades</h1>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-3">
          {tradesData?.trades.length ? tradesData.trades.map(trade => (
            <Card key={trade.id}>
              <CardContent className="p-4">
                <div className="flex justify-between mb-3">
                  <div>
                    <div className="font-bold flex items-center gap-1">
                      {trade.symbol}
                      <span className={`text-xs flex items-center ${trade.direction === 'up' ? 'text-primary' : 'text-destructive'}`}>
                        {trade.direction === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {trade.direction.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{trade.userEmail}</div>
                    <div className="text-xs text-muted-foreground">{trade.duration}s · {trade.profitPercent}% payout</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${trade.amount.toFixed(2)}</div>
                    <Badge
                      variant={trade.status === 'active' ? 'outline' : trade.status === 'win' ? 'default' : 'destructive'}
                      className={trade.status === 'win' ? 'bg-primary' : ''}
                    >
                      {trade.status}
                    </Badge>
                    {trade.profitLoss !== null && (
                      <div className={`text-xs font-medium mt-1 ${(trade.profitLoss ?? 0) > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {(trade.profitLoss ?? 0) > 0 ? '+' : ''}${trade.profitLoss?.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Entry: ${trade.entryPrice.toFixed(2)} · {format(new Date(trade.createdAt), "MMM d, HH:mm")}
                </div>

                {trade.status === 'active' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="sm"
                      onClick={() => setResult.mutate({ id: trade.id, data: { result: 'win' } })}
                      disabled={setResult.isPending}
                    >
                      Force WIN
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      size="sm"
                      onClick={() => setResult.mutate({ id: trade.id, data: { result: 'loss' } })}
                      disabled={setResult.isPending}
                    >
                      Force LOSS
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )) : (
            <div className="text-center py-8 text-muted-foreground">No trades found</div>
          )}
        </div>
      )}
    </div>
  );
}
