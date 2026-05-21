import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  const isAuthRoute = location === "/login" || location === "/register";

  if (!user && !isAuthRoute) {
    // If not authenticated and not on auth route, just render children (which should handle redirect)
    return <>{children}</>;
  }

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground pb-16">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
