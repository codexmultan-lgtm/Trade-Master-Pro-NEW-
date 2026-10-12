import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isTradeRoute = location.startsWith("/trade");
  const isSuspended = user && user.status !== "active";

  return (
    <div className={`flex flex-col min-h-[100dvh] bg-background text-foreground pb-16 ${isTradeRoute ? "trade-shell" : ""}`}>
      <Header />
      <main className={`flex-1 w-full max-w-7xl mx-auto flex flex-col ${isTradeRoute ? "trade-route-main" : ""}`}>
        {isSuspended ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-4 bg-destructive/10 border border-destructive/30 rounded-xl p-8">
              <ShieldAlert className="w-10 h-10 text-destructive mx-auto" />
              <h2 className="text-xl font-bold text-destructive">
                Account {user.status === "frozen" ? "Frozen" : "Banned"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {user.frozenReason || "Your account access has been restricted by an admin. Contact support for details."}
              </p>
              <Button variant="outline" onClick={logout}>Log Out</Button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
      <BottomNav />
    </div>
  );
}
