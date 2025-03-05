import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import HomePage from "@/pages/home-page";
import LoginPage from "@/pages/login-page";
import { useEffect } from "react";
import { connectWebSocket, closeWebSocket } from "@/lib/websocket";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      console.log("認証されていないユーザー、ログインページにリダイレクト中...");
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user) {
      connectWebSocket();
      return () => closeWebSocket();
    }
  }, [user]);

  if (location !== "/") return null;
  
  if (isLoading) return <div className="flex h-screen items-center justify-center">読み込み中...</div>;
  
  return user ? <Component /> : null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="/" component={() => <ProtectedRoute component={HomePage} />} />
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
