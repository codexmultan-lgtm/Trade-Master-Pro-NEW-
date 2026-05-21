import { useGetTradeHistory } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";

export default function History() {
  const { data: historyData, isLoading } = useGetTradeHistory({ limit: 50 });

  if (isLoading) {
    return <div className="p-4 text-center mt-10">Loading history...</div>;
  }

  const trades = historyData?.trades || [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Trade History</h1>
      
      {trades.length > 0 ? (
        <div className="space-y-3">
          {trades.map(trade => (
            <Card key={trade.id} className="bg-card border-border overflow-hidden">
              <div className={`h-1 w-full ${trade.status === 'win' ? 'bg-primary' : trade.status === 'loss' ? 'bg-destructive' : 'bg-muted'}`} />
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${trade.direction === 'up' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                      {trade.direction === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{trade.symbol}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(trade.createdAt), 'MMM dd, HH:mm')}</div>
                    </div>
                  </div>
                  <Badge variant={trade.status === 'win' ? 'default' : trade.status === 'loss' ? 'destructive' : 'outline'} 
                         className={trade.status === 'win' ? 'bg-primary text-primary-foreground' : ''}>
                    {trade.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-sm mt-4 p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Amount</div>
                    <div className="font-medium">${trade.amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Entry Price</div>
                    <div className="font-medium">${trade.entryPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">P&L</div>
                    <div className={`font-bold ${trade.profitLoss && trade.profitLoss > 0 ? 'text-primary' : trade.profitLoss && trade.profitLoss < 0 ? 'text-destructive' : ''}`}>
                      {trade.profitLoss && trade.profitLoss > 0 ? '+' : ''}{trade.profitLoss?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            No trade history available.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
