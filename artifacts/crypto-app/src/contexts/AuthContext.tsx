import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem("crypto_token");
    const storedUser = localStorage.getItem("crypto_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("crypto_token");
        localStorage.removeItem("crypto_user");
      }
    }
    setIsLoading(false);
  }, []);

  const { data: freshUser } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    },
  });

  useEffect(() => {
    if (freshUser) {
      setUser(freshUser);
      localStorage.setItem("crypto_user", JSON.stringify(freshUser));
    }
  }, [freshUser]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("crypto_token", newToken);
    localStorage.setItem("crypto_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    if (newUser.role === "admin") {
      setLocation("/admin");
    } else {
      setLocation("/dashboard");
    }
  };

  const logout = () => {
    localStorage.removeItem("crypto_token");
    localStorage.removeItem("crypto_user");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
