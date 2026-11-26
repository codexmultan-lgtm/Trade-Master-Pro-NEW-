import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAdminWithdrawalAccount,
  useUpdateAdminWithdrawalAccount,
  getGetAdminWithdrawalAccountQueryKey,
  getGetWithdrawalAccountQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function WithdrawalAccountCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = getGetAdminWithdrawalAccountQueryKey(userId);
  const { data: account, isLoading, isError, refetch } = useGetAdminWithdrawalAccount(userId, {
    query: { queryKey, staleTime: 0, refetchInterval: 30_000 },
  });
  const [draft, setDraft] = useState<string | null>(null);
  const update = useUpdateAdminWithdrawalAccount({
    mutation: {
      onSuccess: (saved) => {
        queryClient.setQueryData(queryKey, saved);
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: getGetWithdrawalAccountQueryKey() });
        setDraft(null);
        toast({ title: "Withdrawal account number updated" });
      },
      onError: (error) => {
        const failure = error as unknown as { data?: { error?: string }; message?: string };
        toast({ title: "Update failed", description: failure.data?.error || failure.message || "Please try again.", variant: "destructive" });
      },
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Withdrawal Account</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading withdrawal account...</p>
          : isError ? <div role="alert" className="space-y-2">
            <p className="text-sm text-destructive">Could not load the withdrawal account.</p>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
          : !account ? <p className="text-sm text-muted-foreground">This user has not saved a withdrawal account.</p>
          : <>
            <dl className="text-sm space-y-1 break-words">
              {[
                ["Currency", account.currency],
                ["Account type", account.accountType],
                ["Account holder", account.accountHolder || account.accountHolderName],
                ["Account title", account.accountTitle],
                ["Wallet name", account.accountName],
                ["Bank", account.bankName],
                ["IFSC", account.ifscNumber],
                ["Wallet address", account.walletAddress],
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={label}><dt className="inline text-muted-foreground">{label}: </dt><dd className="inline">{value}</dd></div>
              ))}
            </dl>
            {account.currency === "USDT" ?
              <p className="text-sm text-muted-foreground">USDT uses a wallet address, not an account number.</p>
              : <form className="space-y-3" onSubmit={(event) => {
                event.preventDefault();
                if (draft !== null && draft.trim() && !update.isPending) {
                  update.mutate({ id: userId, data: { accountNumber: draft.trim() } });
                }
              }}>
                <div className="space-y-2">
                  <Label htmlFor="admin-withdrawal-number">Withdrawal account number</Label>
                  <Input id="admin-withdrawal-number" type="text" maxLength={128} required
                    autoComplete="off" value={draft ?? account.accountNumber ?? ""}
                    disabled={update.isPending} onChange={(event) => setDraft(event.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Updates the saved account for future withdrawal requests only. Existing transactions and all other account details stay unchanged.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={update.isPending || draft === null || !draft.trim() || draft.trim() === account.accountNumber}>
                    {update.isPending ? "Saving..." : "Save account number"}
                  </Button>
                  {draft !== null && <Button type="button" variant="outline" disabled={update.isPending} onClick={() => setDraft(null)}>Cancel</Button>}
                </div>
              </form>}
          </>}
      </CardContent>
    </Card>
  );
}
