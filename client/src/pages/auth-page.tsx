import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertUserSchema } from "@shared/schema";
import { MessageCircle } from "lucide-react";

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const { user, login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  if (user) {
    setLocation("/");
    return null;
  }

  const onSubmit = async (data: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      if (activeTab === "login") {
        await login(data.username, data.password);
      } else {
        await register(data.username, data.password);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Local LLM Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    {...form.register("username")}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...form.register("password")}
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {activeTab === "login" ? "Login" : "Register"}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-8">
        <div className="max-w-xl text-primary-foreground">
          <div className="mb-4 flex items-center gap-2">
            <MessageCircle size={40} />
            <h1 className="text-4xl font-bold">Local LLM Chat</h1>
          </div>
          <p className="text-xl opacity-90">
            Your personal AI assistant, running completely locally on your machine.
            Have private conversations and keep your data secure.
          </p>
        </div>
      </div>
    </div>
  );
}
