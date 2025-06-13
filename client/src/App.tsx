import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import HomePage from "@/pages/home-page";
import LoginPage from "@/pages/login-page";
import { useEffect, useState } from "react";
import { connectWebSocket, closeWebSocket } from "@/lib/websocket";
import { SetupWizard } from "@/components/SetupWizard";

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
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    // システムの準備状態をチェック
    checkSystemReady();
  }, []);

  const checkSystemReady = async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const models = await response.json();
        setSetupComplete(models.length > 0);
      } else {
        setSetupComplete(false);
      }
    } catch {
      setSetupComplete(false);
    }
  };

  // セットアップチェック中
  if (setupComplete === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>システムチェック中...</p>
        </div>
      </div>
    );
  }

  // セットアップが必要
  if (!setupComplete) {
    return <SetupWizard onComplete={() => setSetupComplete(true)} />;
  }

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
