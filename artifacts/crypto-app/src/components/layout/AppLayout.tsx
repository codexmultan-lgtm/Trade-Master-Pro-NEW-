import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

export function AppLayout({ children }: { children: ReactNode }) {
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
