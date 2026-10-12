import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Home, LineChart, History, Wallet, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  // Don't show bottom nav on admin routes
  if (location.startsWith("/admin")) return null;

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/trade", icon: LineChart, label: "Trade" },
    { href: "/history", icon: History, label: "History" },
    { href: "/wallet", icon: Wallet, label: "Wallet" },
    { href: "/profile", icon: UserIcon, label: "Profile" },
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${location.startsWith("/trade") ? "trade-bottom-nav" : ""}`}>
      <nav className="flex h-16 items-center justify-around px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.startsWith(item.href);
          
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center space-y-1 min-w-[64px] h-full",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
