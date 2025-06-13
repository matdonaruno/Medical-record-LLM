import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Settings, Upload, Download, Trash2, RefreshCw } from 'lucide-react';

// 型定義は electron.d.ts で定義済み

interface Model {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export function ModelManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [modelsPath, setModelsPath] = useState<string>('');
  const [importProgress, setImportProgress] = useState<string>('');
  const { toast } = useToast();

  // Electronのチェック
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    if (isElectron && isOpen) {
      loadModels();
      loadModelsPath();
      
      // イベントリスナーを設定
      window.electronAPI!.onModelProgress((progress) => {
        setImportProgress(progress);
      });
      
      window.electronAPI!.onModelReady((ready) => {
        if (ready) {
          setImportProgress('');
          loadModels();
          toast({
            title: "モデル準備完了",
            description: "モデルが使用可能になりました。",
          });
        }
      });
      
      window.electronAPI!.onOllamaError((error) => {
        toast({
          title: "エラー",
          description: error,
          variant: "destructive",
        });
      });
    }
  }, [isOpen, isElectron]);

  const loadModels = async () => {
    if (!isElectron) return;
    
    setLoading(true);
    try {
      const availableModels = await window.electronAPI!.getAvailableModels();
      setModels(availableModels);
    } catch (error) {
      console.error('Failed to load models:', error);
      toast({
        title: "エラー",
        description: "モデルの読み込みに失敗しました。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadModelsPath = async () => {
    if (!isElectron) return;
    
    try {
      const path = await window.electronAPI!.getModelsPath();
      setModelsPath(path);
    } catch (error) {
      console.error('Failed to get models path:', error);
    }
  };

  const handleImportModel = async () => {
    if (!isElectron) return;
    
    try {
      const filePath = await window.electronAPI!.selectModelFile();
      if (!filePath) return;

      setImportProgress('モデルをインポート中...');
      const result = await window.electronAPI!.importModel(filePath);
      
      if (result.success) {
        toast({
          title: "成功",
          description: "モデルが正常にインポートされました。",
        });
        loadModels();
      } else {
        toast({
          title: "エラー",
          description: result.error || "モデルのインポートに失敗しました。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Model import error:', error);
      toast({
        title: "エラー",
        description: "モデルのインポートに失敗しました。",
        variant: "destructive",
      });
    } finally {
      setImportProgress('');
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  if (!isElectron) {
    return null; // Electronでない場合は何も表示しない
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          モデル管理
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>LLMモデル管理</DialogTitle>
          <DialogDescription>
            利用可能なLLMモデルの管理とインポート
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* モデルパス情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">モデル保存先</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-muted p-2 rounded block">{modelsPath}</code>
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <Button onClick={handleImportModel} disabled={!!importProgress}>
              <Upload className="h-4 w-4 mr-2" />
              モデルをインポート
            </Button>
            <Button variant="outline" onClick={loadModels} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              更新
            </Button>
          </div>

          {/* インポート進行状況 */}
          {importProgress && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{importProgress}</div>
              </CardContent>
            </Card>
          )}

          {/* モデル一覧 */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">利用可能なモデル</h3>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">読み込み中...</p>
              </div>
            ) : models.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">インストールされたモデルがありません。</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    モデルファイルをインポートしてください。
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {models.map((model, index) => (
                  <Card key={`${model.name}-${index}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{model.name}</CardTitle>
                          <CardDescription>
                            サイズ: {formatFileSize(model.size)} | 
                            更新日: {formatDate(model.modified_at)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            {model.details?.parameter_size || 'Unknown'}
                          </Badge>
                          {model.details?.quantization_level && (
                            <Badge variant="outline">
                              {model.details.quantization_level}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">ファミリー:</span> {model.details?.family || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-medium">フォーマット:</span> {model.details?.format || 'Unknown'}
                        </div>
                      </div>
                      <div className="mt-2">
                        <code className="text-xs bg-muted p-1 rounded">{model.digest}</code>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}