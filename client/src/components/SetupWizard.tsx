import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Download, AlertCircle } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

interface SetupStatus {
  ollamaInstalled: boolean;
  ollamaRunning: boolean;
  modelsAvailable: boolean;
  serverRunning: boolean;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [status, setStatus] = useState<SetupStatus>({
    ollamaInstalled: false,
    ollamaRunning: false,
    modelsAvailable: false,
    serverRunning: false,
  });
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setChecking(true);
    setError(null);

    try {
      // サーバー状態をチェック
      try {
        const serverRes = await fetch('/api/health');
        setStatus(prev => ({ ...prev, serverRunning: serverRes.ok }));
      } catch {
        setStatus(prev => ({ ...prev, serverRunning: false }));
      }

      // Ollama状態をチェック
      try {
        const ollamaRes = await fetch('/api/models');
        if (ollamaRes.ok) {
          const models = await ollamaRes.json();
          setStatus(prev => ({
            ...prev,
            ollamaInstalled: true,
            ollamaRunning: true,
            modelsAvailable: models.length > 0,
          }));
        } else {
          setStatus(prev => ({
            ...prev,
            ollamaInstalled: false,
            ollamaRunning: false,
            modelsAvailable: false,
          }));
        }
      } catch {
        setStatus(prev => ({
          ...prev,
          ollamaInstalled: false,
          ollamaRunning: false,
          modelsAvailable: false,
        }));
      }
    } catch (err) {
      setError('システムチェック中にエラーが発生しました');
    } finally {
      setChecking(false);
    }
  };

  const isReady = status.serverRunning && status.ollamaRunning && status.modelsAvailable;

  const StatusItem = ({ label, value }: { label: string; value: boolean }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">{label}</span>
      {checking ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
      ) : value ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <XCircle className="w-4 h-4 text-red-600" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Medical Record LLM セットアップ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>システムチェック</AlertTitle>
              <AlertDescription>
                アプリケーションの動作に必要なコンポーネントを確認しています。
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <StatusItem label="サーバー" value={status.serverRunning} />
              <StatusItem label="Ollama インストール" value={status.ollamaInstalled} />
              <StatusItem label="Ollama 実行中" value={status.ollamaRunning} />
              <StatusItem label="LLMモデル" value={status.modelsAvailable} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!checking && !status.ollamaInstalled && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ollamaが検出されません</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">
                    Medical Record LLMに同梱されたOllamaが見つかりません。
                    配布パッケージが正しくインストールされているか確認してください。
                  </p>
                  <p className="text-sm text-gray-600">
                    エラーが続く場合は、システム管理者にお問い合わせください。
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {!checking && status.ollamaInstalled && !status.modelsAvailable && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>LLMモデルをインストール</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">
                    コマンドプロンプトで以下のコマンドを実行してください：
                  </p>
                  <code className="block bg-gray-100 p-2 rounded text-sm">
                    ollama pull llama3:latest
                  </code>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={checkSystemStatus}
                disabled={checking}
                variant="outline"
                className="flex-1"
              >
                {checking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    チェック中...
                  </>
                ) : (
                  '再チェック'
                )}
              </Button>
              <Button
                onClick={onComplete}
                disabled={!isReady}
                className="flex-1"
              >
                開始
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}