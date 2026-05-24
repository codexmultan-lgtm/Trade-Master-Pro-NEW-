import { useState } from "react";
import {
  useGetAdminTransactions,
  useApproveTransaction,
  useRejectTransaction,
  getGetAdminTransactionsQueryKey,
} from "@workspace/api-client-react";
import { formatAmount } from "@/lib/currency";
import { usePlatformSettings } from "@/contexts/PlatformSettingsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertCircle, CreditCard, Building2 } from "lucide-react";

export default function AdminTransactions() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { currencySymbol } = usePlatformSettings();

  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveNotes, setApproveNotes] = useState("");

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: txData, isLoading } = useGetAdminTransactions({ status: statusFilter as any, limit: 100 });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fmt = (n: number) => formatAmount(n, currencySymbol);

  const approve = useApproveTransaction({
    mutation: {
      onSuccess: () => {
        toast({ title: "Transaction approved" });
        queryClient.invalidateQueries({ queryKey: getGetAdminTransactionsQueryKey() });
        setApproveId(null);
        setApproveNotes("");
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
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
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    }
  });

  const handleApprove = () => {
    if (!approveId) return;
    approve.mutate({ id: approveId, data: { adminNotes: approveNotes.trim() || undefined } });
  };

  const handleReject = () => {
    if (!rejectId || !rejectReason.trim()) return;
    reject.mutate({ id: rejectId, data: { reason: rejectReason } });
  };

  const transactions = txData?.transactions ?? [];
  const withdrawals = transactions.filter(t => t.type === "withdrawal");
  const deposits = transactions.filter(t => t.type !== "withdrawal");

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
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No {statusFilter} transactions found.</div>
      ) : (
        <div className="space-y-6">
          {/* Withdrawals section */}
          {withdrawals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Withdrawals ({withdrawals.length})
              </h2>
              {withdrawals.map(tx => (
                <TxCard
                  key={tx.id}
                  tx={tx}
                  fmt={fmt}
                  onApprove={() => { setApproveId(tx.id); setApproveNotes(""); }}
                  onReject={() => { setRejectId(tx.id); setRejectReason(""); }}
                  isPending={approve.isPending || reject.isPending}
                />
              ))}
            </div>
          )}

          {/* Deposits section */}
          {deposits.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Deposits ({deposits.length})
              </h2>
              {deposits.map(tx => (
                <TxCard
                  key={tx.id}
                  tx={tx}
                  fmt={fmt}
                  onApprove={() => { setApproveId(tx.id); setApproveNotes(""); }}
                  onReject={() => { setRejectId(tx.id); setRejectReason(""); }}
                  isPending={approve.isPending || reject.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approve dialog */}
      <Dialog open={!!approveId} onOpenChange={(open) => { if (!open) setApproveId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <CheckCircle className="w-5 h-5" /> Approve Transaction
            </DialogTitle>
            <DialogDescription>
              Optionally add a note for the user (e.g. processing time, confirmation details).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Admin Note <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              placeholder="e.g. Payment received, funds credited to your account."
              value={approveNotes}
              onChange={e => setApproveNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveId(null)}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleApprove} disabled={approve.isPending}>
              {approve.isPending ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) setRejectId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" /> Reject Transaction
            </DialogTitle>
            <DialogDescription>
              Provide a reason so the user understands why their request was declined.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Rejection Reason <span className="text-destructive text-xs">*required</span></Label>
            <Textarea
              placeholder="e.g. Insufficient account details, wrong payment method, duplicate request..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={reject.isPending || !rejectReason.trim()}>
              {reject.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TxCardProps {
  tx: any;
  fmt: (n: number) => string;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}

function TxCard({ tx, fmt, onApprove, onReject, isPending }: TxCardProps) {
  const isWithdrawal = tx.type === "withdrawal";

  return (
    <Card className={`border ${tx.status === "rejected" ? "border-destructive/30" : tx.status === "approved" ? "border-primary/30" : "border-border"}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold capitalize">{tx.type.replace(/_/g, " ")}</div>
            <div className="text-xs text-muted-foreground">{tx.userEmail}</div>
            <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</div>
          </div>
          <div className="text-right space-y-1">
            <div className="font-bold text-lg">{fmt(tx.amount)}</div>
            <Badge
              variant={tx.status === "pending" ? "outline" : tx.status === "approved" ? "default" : "destructive"}
              className={tx.status === "approved" ? "bg-primary" : ""}
            >
              {tx.status}
            </Badge>
          </div>
        </div>

        {/* Method */}
        {tx.method && (
          <div className="text-xs text-muted-foreground capitalize">
            Method: <span className="text-foreground">{tx.method.replace(/_/g, " ")}</span>
          </div>
        )}

        {/* Withdrawal destination — most important for admin */}
        {isWithdrawal && tx.accountDetails && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="text-xs font-semibold text-amber-400 mb-1">Send funds to:</div>
            <div className="text-sm font-mono break-all">{tx.accountDetails}</div>
          </div>
        )}

        {/* Deposit notes (sender number) */}
        {!isWithdrawal && tx.notes && !tx.notes.startsWith("Admin") && (
          <div className="text-xs text-muted-foreground">
            Notes: <span className="text-foreground">{tx.notes}</span>
          </div>
        )}

        {/* Admin note on approved */}
        {tx.status === "approved" && tx.notes && (
          <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-lg p-3">
            <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-primary">Admin Note</div>
              <div className="text-sm">{tx.notes}</div>
            </div>
          </div>
        )}

        {/* Rejection reason */}
        {tx.status === "rejected" && tx.rejectionReason && (
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-destructive">Rejection Reason</div>
              <div className="text-sm">{tx.rejectionReason}</div>
            </div>
          </div>
        )}

        {/* Action buttons for pending */}
        {tx.status === "pending" && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={onApprove}
              disabled={isPending}
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={onReject}
              disabled={isPending}
            >
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
