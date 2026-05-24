import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PlatformSettingsProvider } from "@/contexts/PlatformSettingsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import TradeList from "@/pages/trade-list";
import TradePage from "@/pages/trade";
import History from "@/pages/history";
import Wallet from "@/pages/wallet";
import Profile from "@/pages/profile";
import Notifications from "@/pages/notifications";

import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users/index";
import AdminUserDetail from "@/pages/admin/users/detail";
import AdminTransactions from "@/pages/admin/transactions";
import AdminTrades from "@/pages/admin/trades";
import AdminSettings from "@/pages/admin/settings";

const queryClient = new QueryClient();

function Router() {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 animate-pulse" />
          <span className="text-white/40 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {user ? (isAdmin ? <Redirect to="/admin" /> : <Redirect to="/dashboard" />) : <Landing />}
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/dashboard">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <Redirect to="/admin" /> : <AppLayout><Dashboard /></AppLayout>}
      </Route>
      <Route path="/trade">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <Redirect to="/admin" /> : <AppLayout><TradeList /></AppLayout>}
      </Route>
      <Route path="/trade/:symbol">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <Redirect to="/admin" /> : <AppLayout><TradePage /></AppLayout>}
      </Route>
      <Route path="/history">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <Redirect to="/admin" /> : <AppLayout><History /></AppLayout>}
      </Route>
      <Route path="/wallet">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <Redirect to="/admin" /> : <AppLayout><Wallet /></AppLayout>}
      </Route>
      <Route path="/profile">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <Redirect to="/admin" /> : <AppLayout><Profile /></AppLayout>}
      </Route>
      <Route path="/notifications">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <Redirect to="/admin" /> : <AppLayout><Notifications /></AppLayout>}
      </Route>

      <Route path="/admin">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <AppLayout><AdminDashboard /></AppLayout> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/admin/users">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <AppLayout><AdminUsers /></AppLayout> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/admin/users/:id">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <AppLayout><AdminUserDetail /></AppLayout> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/admin/transactions">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <AppLayout><AdminTransactions /></AppLayout> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/admin/trades">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <AppLayout><AdminTrades /></AppLayout> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/admin/settings">
        {() => !user ? <Redirect to="/login" /> : isAdmin ? <AppLayout><AdminSettings /></AppLayout> : <Redirect to="/dashboard" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <PlatformSettingsProvider>
              <Router />
            </PlatformSettingsProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
