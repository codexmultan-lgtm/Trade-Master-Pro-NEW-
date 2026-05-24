import { Link, useLocation } from "wouter";
import { Bell, ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUnreadNotificationCount, useGetCurrentPrice } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

export function Header() {
  const [location, setLocation] = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const { data: unreadCount } = useGetUnreadNotificationCount({
    query: { enabled: !!user }
  });
  
  const { data: btcPriceData } = useGetCurrentPrice("BTCUSDT", {
    query: { enabled: !!user, staleTime: 30000 } // initial fetch
  });

  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const { subscribe } = useSocket();

  useEffect(() => {
    if (btcPriceData) {
      setBtcPrice(btcPriceData.price);
    }
  }, [btcPriceData]);

  useEffect(() => {
    const unsub = subscribe("price_update", (data) => {
      if (data.symbol === "BTCUSDT") {
        setBtcPrice(data.price);
      }
    });
    return unsub;
  }, [subscribe]);

  if (!user) return null;

  const isAdminRoute = location.startsWith("/admin");
  const isBackable = location !== "/dashboard" && location !== "/trade" && location !== "/history" && location !== "/wallet" && location !== "/profile" && location !== "/admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14 flex items-center px-4 justify-between">
      <div className="flex items-center gap-2">
        {isBackable ? (
          <Button variant="ghost" size="icon" className="mr-1 h-8 w-8" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mr-2">
            DualTrade
          </div>
        )}
        
        {!isAdminRoute && (
          <div className="hidden sm:flex items-center text-xs font-mono text-muted-foreground ml-2">
            BTC/USDT <span className="text-foreground ml-1">${btcPrice?.toFixed(2) || "---"}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && !isAdminRoute && (
          <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={() => setLocation("/admin")}>
            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
            Admin
          </Button>
        )}
        {isAdminRoute && (
          <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => logout()}>
            Logout
          </Button>
        )}
        
        {!isAdminRoute && (
          <Button variant="ghost" size="icon" className="relative h-8 w-8" onClick={() => setLocation("/notifications")}>
            <Bell className="h-5 w-5 text-muted-foreground" />
            {!!unreadCount?.count && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full">
                {unreadCount.count}
              </Badge>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
