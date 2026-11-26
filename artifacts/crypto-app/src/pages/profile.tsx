import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import {
  useChangePassword,
  useGetWithdrawalAccount,
  getGetWithdrawalAccountQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User as UserIcon, HeartPulse, TrendingUp, ShieldCheck, AlertTriangle, Building2, CircleDollarSign } from "lucide-react";
import ProfileHealthRing from "@/components/ProfileHealthRing";

function healthTips(value: number): { icon: typeof ShieldCheck; text: string }[] {
  if (value >= 85) {
    return [{ icon: ShieldCheck, text: "Your account is in excellent standing. Keep it up!" }];
  }
  if (value >= 70) {
    return [{ icon: TrendingUp, text: "Your account is in good standing." }];
  }
  if (value >= 40) {
    return [{ icon: AlertTriangle, text: "Your health score has dipped. Contact support if you have questions." }];
  }
  return [{ icon: AlertTriangle, text: "Your health score is low. This may affect your account privileges. Contact support." }];
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { data: withdrawalAccount, isLoading: isWithdrawalAccountLoading } = useGetWithdrawalAccount({
    query: { queryKey: getGetWithdrawalAccountQueryKey(), staleTime: 0, refetchOnWindowFocus: true },
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const { toast } = useToast();

  const changePwd = useChangePassword({
    mutation: {
      onSuccess: () => {
        toast({ title: "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
      },
      onError: (err: any) => {
        toast({ title: "Failed to change password", description: err.message, variant: "destructive" });
      }
    }
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    changePwd.mutate({ data: { currentPassword, newPassword } });
  };

  if (!user) return null;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className={`text-xs uppercase mt-1 px-2 py-0.5 rounded inline-block ${
              user.status === "active" ? "bg-secondary text-secondary-foreground" : "bg-destructive/20 text-destructive"
            }`}>
              {user.status}
            </div>
            {user.status !== "active" && user.frozenReason && (
              <div className="text-xs text-destructive mt-1">Reason: {user.frozenReason}</div>
            )}
            {user.withdrawalBanned && (
              <div className="text-xs text-destructive mt-1">
                Withdrawals disabled{user.withdrawalBanReason ? ` — ${user.withdrawalBanReason}` : ""}
              </div>
            )}
            {user.tradeBanned && (
              <div className="text-xs text-destructive mt-1">
                Trading disabled{user.tradeBanReason ? ` — ${user.tradeBanReason}` : ""}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border overflow-hidden relative">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-primary" />
            Profile Health
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5 pt-2 pb-6">
          <ProfileHealthRing value={user.profileHealth ?? 100} />

          <div className="w-full space-y-2">
            {healthTips(user.profileHealth ?? 100).map((tip, i) => {
              const Icon = tip.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 bg-secondary/60 rounded-lg p-3 text-sm text-muted-foreground"
                >
                  <Icon className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <span>{tip.text}</span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your Profile Health score reflects your account standing and is managed by our team.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {withdrawalAccount?.currency === "USDT"
              ? <CircleDollarSign className="w-5 h-5 text-primary" />
              : <Building2 className="w-5 h-5 text-primary" />}
            Withdrawal Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isWithdrawalAccountLoading ? (
            <p className="text-sm text-muted-foreground">Loading saved account...</p>
          ) : !withdrawalAccount ? (
            <p className="text-sm text-muted-foreground">No withdrawal account saved yet. Add one from your wallet.</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div><dt className="inline text-muted-foreground">Currency: </dt><dd className="inline font-medium">{withdrawalAccount.currency}</dd></div>
              {withdrawalAccount.accountType && <div><dt className="inline text-muted-foreground">Account type: </dt><dd className="inline capitalize">{withdrawalAccount.accountType}</dd></div>}
              {(withdrawalAccount.accountHolder || withdrawalAccount.accountHolderName) && (
                <div><dt className="inline text-muted-foreground">Account holder: </dt><dd className="inline">{withdrawalAccount.accountHolder || withdrawalAccount.accountHolderName}</dd></div>
              )}
              {withdrawalAccount.accountTitle && <div><dt className="inline text-muted-foreground">Account title: </dt><dd className="inline">{withdrawalAccount.accountTitle}</dd></div>}
              {withdrawalAccount.accountName && <div><dt className="inline text-muted-foreground">Wallet name: </dt><dd className="inline">{withdrawalAccount.accountName}</dd></div>}
              {withdrawalAccount.bankName && <div><dt className="inline text-muted-foreground">Bank: </dt><dd className="inline">{withdrawalAccount.bankName}</dd></div>}
              {withdrawalAccount.ifscNumber && <div><dt className="inline text-muted-foreground">IFSC: </dt><dd className="inline">{withdrawalAccount.ifscNumber}</dd></div>}
              {withdrawalAccount.currency === "USDT" ? (
                <div className="break-all"><dt className="inline text-muted-foreground">Wallet address: </dt><dd className="inline font-mono">{withdrawalAccount.walletAddress}</dd></div>
              ) : (
                <div className="break-all"><dt className="inline text-muted-foreground">Account number: </dt><dd className="inline font-mono">{withdrawalAccount.accountNumber}</dd></div>
              )}
              <p className="pt-2 text-xs text-muted-foreground">This is the current saved destination for future withdrawal requests.</p>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={changePwd.isPending}>
              {changePwd.isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onClick={logout}>
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </Button>
    </div>
  );
}
