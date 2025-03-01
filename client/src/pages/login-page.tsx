"use client"

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { BrainCircuit } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      console.log("ログイン試行中...");
      const user = await login(staffId, password);
      console.log("ログイン成功、リダイレクト中...", user);
      // 少し遅延を入れてからリダイレクト
      setTimeout(() => {
        setLocation("/");
      }, 100);
    } catch (err: any) {
      console.error("ログインエラー:", err);
      // エラーメッセージからJSON部分を取り除き、メッセージのみを表示
      const errorMessage = err.message || "ログインに失敗しました";
      const match = errorMessage.match(/"message":"([^"]+)"/);
      setError(match ? match[1] : errorMessage);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(password)) {
      setError("パスワードは英数字のみ使用できます");
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    try {
      await register(staffId, password);
      setLocation("/");
    } catch (err: any) {
      const errorMessage = err.message || "登録に失敗しました";
      const match = errorMessage.match(/"message":"([^"]+)"/);
      setError(match ? match[1] : errorMessage);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess(false);
    
    try {
      const res = await apiRequest("POST", "/api/reset-password", { username: resetEmail });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "パスワードのリセットに失敗しました");
      }
      
      setResetSuccess(true);
    } catch (err: any) {
      const errorMessage = err.message || "パスワードのリセットに失敗しました";
      const match = errorMessage.match(/"message":"([^"]+)"/);
      setResetError(match ? match[1] : errorMessage);
    }
  };

  return (
    <div className="flex min-h-screen flex-col-reverse md:flex-row">
      {/* Left side - Modern design */}
      <div className="flex flex-1 flex-col justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 p-6 text-white md:p-10">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-8 flex flex-col items-center justify-center gap-4">
            <BrainCircuit size={64} className="text-gray-300" />
            <h1 className="text-4xl font-bold tracking-tight">Medical Record LLM</h1>
            <h2 className="text-xl font-medium text-gray-300">AI Assistant for Healthcare Professionals</h2>
          </div>
        </div>
      </div>

      {/* Right side - Authentication form */}
      <div className="flex flex-1 items-center justify-center bg-white p-6 md:p-10">
        <div className="w-full max-w-md">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">ログイン</TabsTrigger>
              <TabsTrigger value="signup">新規登録</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>ログイン</CardTitle>
                  <CardDescription>職員IDとパスワードを入力してログインしてください。</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="staffId">職員ID</Label>
                      <Input
                        id="staffId"
                        type="text"
                        placeholder="職員ID"
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">パスワード</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="パスワード"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="text-right">
                      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                        <DialogTrigger asChild>
                          <Button variant="link" className="p-0 h-auto text-sm">
                            パスワードをお忘れですか？
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>パスワードのリセット</DialogTitle>
                            <DialogDescription>
                              職員IDを入力してパスワードをリセットします。
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleResetPassword}>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="resetEmail">職員ID</Label>
                                <Input
                                  id="resetEmail"
                                  type="text"
                                  placeholder="職員ID"
                                  value={resetEmail}
                                  onChange={(e) => setResetEmail(e.target.value)}
                                  required
                                />
                              </div>
                              {resetError && (
                                <Alert variant="destructive">
                                  <AlertDescription>{resetError}</AlertDescription>
                                </Alert>
                              )}
                              {resetSuccess && (
                                <Alert>
                                  <AlertDescription>
                                    パスワードリセットの手続きが完了しました。管理者にお問い合わせください。
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                            <DialogFooter>
                              <Button type="submit">リセット</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-gray-950"
                    >
                      ログイン
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>新規登録</CardTitle>
                  <CardDescription>新しいアカウントを作成するには、以下の情報を入力してください。</CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newStaffId">職員ID</Label>
                      <Input
                        id="newStaffId"
                        type="text"
                        placeholder="職員ID"
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">パスワード（6文字以上の英数字）</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="パスワード"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        placeholder="パスワード（確認）" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required 
                      />
                    </div>
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-gray-950"
                    >
                      登録
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 