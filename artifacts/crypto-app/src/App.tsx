import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

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
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/">
          {user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
        </Route>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        
        <Route path="/dashboard">
          {() => user ? <Dashboard /> : <Redirect to="/login" />}
        </Route>
        <Route path="/trade">
          {() => user ? <TradeList /> : <Redirect to="/login" />}
        </Route>
        <Route path="/trade/:symbol">
          {() => user ? <TradePage /> : <Redirect to="/login" />}
        </Route>
        <Route path="/history">
          {() => user ? <History /> : <Redirect to="/login" />}
        </Route>
        <Route path="/wallet">
          {() => user ? <Wallet /> : <Redirect to="/login" />}
        </Route>
        <Route path="/profile">
          {() => user ? <Profile /> : <Redirect to="/login" />}
        </Route>
        <Route path="/notifications">
          {() => user ? <Notifications /> : <Redirect to="/login" />}
        </Route>

        <Route path="/admin">
          {() => user && isAdmin ? <AdminDashboard /> : <Redirect to="/dashboard" />}
        </Route>
        <Route path="/admin/users">
          {() => user && isAdmin ? <AdminUsers /> : <Redirect to="/dashboard" />}
        </Route>
        <Route path="/admin/users/:id">
          {() => user && isAdmin ? <AdminUserDetail /> : <Redirect to="/dashboard" />}
        </Route>
        <Route path="/admin/transactions">
          {() => user && isAdmin ? <AdminTransactions /> : <Redirect to="/dashboard" />}
        </Route>
        <Route path="/admin/trades">
          {() => user && isAdmin ? <AdminTrades /> : <Redirect to="/dashboard" />}
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
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
