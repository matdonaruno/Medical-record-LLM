import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiRequest("GET", "/api/user");
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "ログインに失敗しました");
      }

      const userData = await res.json();
      setUser(userData);
      
      // ログイン成功時にキャッシュをクリア
      queryClient.clear();
      
      return userData;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const res = await apiRequest("POST", "/api/register", { username, password });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "登録に失敗しました");
      }
      
      const userData = await res.json();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error("登録エラー:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        console.error("ログアウトエラー:", res.statusText);
      }
      setUser(null);
    } catch (error) {
      console.error("ログアウトエラー:", error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
