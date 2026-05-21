import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useChangePassword } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User as UserIcon } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
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
            <div className="text-xs uppercase mt-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded inline-block">
              {user.status}
            </div>
          </div>
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
