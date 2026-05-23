import { useState } from "react";
import { useGetAdminTransactions, useApproveTransaction, useRejectTransaction, getGetAdminTransactionsQueryKey } from "@workspace/api-client-react";
import { formatPKR } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminTransactions() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { data: txData, isLoading } = useGetAdminTransactions({ status: statusFilter as any, limit: 50 });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approve = useApproveTransaction({
    mutation: {
      onSuccess: () => {
        toast({ title: "Transaction approved" });
        queryClient.invalidateQueries({ queryKey: getGetAdminTransactionsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    }
  });

  const reject = useRejectTransaction({
    mutation: {
      onSuccess: () => {
        toast({ title: "Transaction rejected" });
        queryClient.invalidateQueries({ queryKey: getGetAdminTransactionsQueryKey() });
        setRejectId(null);
        setRejectReason("");
      },
      onError: (err: any) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    }
  });

  const handleReject = () => {
    if (!rejectId || !rejectReason.trim()) return;
    reject.mutate({ id: rejectId, data: { reason: rejectReason } });
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-3">
          {txData?.transactions.length ? txData.transactions.map(tx => (
            <Card key={tx.id}>
              <CardContent className="p-4">
                <div className="flex justify-between mb-2">
                  <div>
                    <div className="font-bold capitalize">{tx.type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-muted-foreground">{tx.userEmail}</div>
                    <div className="text-xs text-muted-foreground">{tx.method}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatPKR(tx.amount)}</div>
                    <Badge
                      variant={tx.status === 'pending' ? 'outline' : tx.status === 'approved' ? 'default' : 'destructive'}
                      className={tx.status === 'approved' ? 'bg-primary' : ''}
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>

                {tx.status === 'pending' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90"
                      onClick={() => approve.mutate({ id: tx.id })}
                      disabled={approve.isPending || reject.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => { setRejectId(tx.id); setRejectReason(""); }}
                      disabled={approve.isPending || reject.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {tx.rejectionReason && (
                  <div className="mt-2 text-xs text-muted-foreground">Reason: {tx.rejectionReason}</div>
                )}
              </CardContent>
            </Card>
          )) : (
            <div className="text-center py-8 text-muted-foreground">No transactions found</div>
          )}
        </div>
      )}

      <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) setRejectId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Rejection Reason</Label>
            <Input
              placeholder="Enter reason..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={reject.isPending || !rejectReason.trim()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
