import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
        {user ? <Redirect to="/dashboard" /> : <Landing />}
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/dashboard">
        {() => user ? <AppLayout><Dashboard /></AppLayout> : <Redirect to="/login" />}
      </Route>
      <Route path="/trade">
        {() => user ? <AppLayout><TradeList /></AppLayout> : <Redirect to="/login" />}
      </Route>
      <Route path="/trade/:symbol">
        {() => user ? <AppLayout><TradePage /></AppLayout> : <Redirect to="/login" />}
      </Route>
      <Route path="/history">
        {() => user ? <AppLayout><History /></AppLayout> : <Redirect to="/login" />}
      </Route>
      <Route path="/wallet">
        {() => user ? <AppLayout><Wallet /></AppLayout> : <Redirect to="/login" />}
      </Route>
      <Route path="/profile">
        {() => user ? <AppLayout><Profile /></AppLayout> : <Redirect to="/login" />}
      </Route>
      <Route path="/notifications">
        {() => user ? <AppLayout><Notifications /></AppLayout> : <Redirect to="/login" />}
      </Route>

      <Route path="/admin">
        {() => user && isAdmin ? <AppLayout><AdminDashboard /></AppLayout> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/admin/users">
        {() => user && isAdmin ? <AppLayout><AdminUsers /></AppLayout> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/admin/users/:id">
        {() => user && isAdmin ? <AppLayout><AdminUserDetail /></AppLayout> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/admin/transactions">
        {() => user && isAdmin ? <AppLayout><AdminTransactions /></AppLayout> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/admin/trades">
        {() => user && isAdmin ? <AppLayout><AdminTrades /></AppLayout> : <Redirect to="/dashboard" />}
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
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
