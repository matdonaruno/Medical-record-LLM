import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModelSettings {
  id: number;
  model_name: string;
  display_name: string;
  size?: string;
  modified_at?: string;
}

interface ModelsResponse {
  models: ModelSettings[];
  currentModel: string;
}

export default function ChatHeader() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentModel, setCurrentModel] = useState<string>("");

  // モデル一覧を取得
  const { data: modelsData } = useQuery<ModelsResponse>({
    queryKey: ["/api/models"],
  });

  // データが変更されたらcurrentModelを更新
  useEffect(() => {
    if (modelsData) {
      setCurrentModel(modelsData.currentModel);
    }
  }, [modelsData]);

  // モデル変更のミューテーション
  const changeModelMutation = useMutation({
    mutationFn: async (modelName: string) => {
      const res = await apiRequest("POST", "/api/models/default", { modelName });
      if (!res.ok) {
        throw new Error("モデルの変更に失敗しました");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
    },
  });

  const handleModelChange = (value: string) => {
    setCurrentModel(value);
    changeModelMutation.mutate(value);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="border-b p-4 flex justify-between items-center bg-background">
      <div className="font-semibold">Medical record LLM</div>
      <div className="flex items-center gap-4">
        {modelsData?.models && (
          <div className="flex items-center">
            <Select value={currentModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="モデルを選択" />
              </SelectTrigger>
              <SelectContent>
                {modelsData.models.map((model) => (
                  <SelectItem key={model.id} value={model.model_name}>
                    <div className="flex flex-col">
                      <span>{model.display_name}</span>
                      <span className="text-xs text-gray-500">{model.model_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <img 
              src="/ollama-logo.png" 
              alt="Ollama" 
              className="w-6 h-auto ml-2 object-contain" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        {user && <span>{user.username}</span>}
        <Button variant="outline" size="sm" onClick={handleLogout}>
          ログアウト
        </Button>
      </div>
    </div>
  );
}
