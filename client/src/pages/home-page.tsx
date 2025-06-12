import { useAuth } from "@/hooks/use-auth";
import ChatHeader from "@/components/chat/chat-header";
import MessageList from "@/components/chat/message-list";
import MessageInput from "@/components/chat/message-input";
import { ModelManager } from "@/components/model-manager";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Message } from "@shared/schema";
import { useEffect, useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, MoreHorizontal, Trash, GripVertical, Edit } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMessageHandler } from "@/lib/websocket";

interface Chat {
  id: number;
  title: string;
  userId: number;
}

interface ModelsResponse {
  models: Array<{
    id: number;
    model_name: string;
    display_name: string;
    size?: string;
    modified_at?: string;
  }>;
  currentModel: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelName, setModelName] = useState<string>("llama3");
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(256); // デフォルト幅
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [chatToRename, setChatToRename] = useState<{id: number, title: string} | null>(null);
  const [newChatTitle, setNewChatTitle] = useState("");
  
  // リサイズ用の参照
  const resizeRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  // モデル情報を取得
  const { data: modelsData } = useQuery<ModelsResponse>({
    queryKey: ["/api/models"],
    refetchInterval: 30000, // 30秒ごとに更新
  });

  // モデル情報が更新されたときに状態を同期
  useEffect(() => {
    if (modelsData) {
      setModelName(modelsData.currentModel);
      setCurrentModel(modelsData.currentModel);
    }
  }, [modelsData]);

  // WebSocketメッセージハンドラーを設定
  useEffect(() => {
    const removeHandler = addMessageHandler((message) => {
      if (message.type === "new_message") {
        queryClient.invalidateQueries({ queryKey: ["/api/messages", currentChatId] });
      }
    });

    return () => removeHandler();
  }, [currentChatId, queryClient]);

  // システムプロンプトを設定
  useEffect(() => {
    const setJapaneseSystemPrompt = async () => {
      try {
        await apiRequest("POST", "/api/system-prompt", {
          content: "あなたは医療現場のパソコン業務を支援する日本語AIアシスタントです。常に日本語で回答してください。信頼性の低いものやわからないものは'よくわかりません'と回答してください。"
        });
      } catch (error) {
        console.error("システムプロンプトの設定に失敗しました:", error);
      }
    };
    
    setJapaneseSystemPrompt();
  }, []);

  // ユーザーが変わった時にチャットデータをリセット
  useEffect(() => {
    if (user) {
      console.log(`ユーザー変更を検出: ${user.username} (ID: ${user.id})`);
      setCurrentChatId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    }
  }, [user?.id, queryClient]);

  // チャット一覧を取得
  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
    enabled: !!user,
  });

  // 最初のチャットを自動選択
  useEffect(() => {
    if (chats.length > 0 && !currentChatId) {
      console.log(`最初のチャットを自動選択: ${chats[0].id}`);
      setCurrentChatId(chats[0].id);
    }
  }, [chats, currentChatId]);

  // メッセージ一覧を取得
  const { data: messages = [], isError } = useQuery<Message[]>({
    queryKey: ["/api/messages", currentChatId],
    queryFn: async () => {
      if (!user) return [];
      
      if (currentChatId) {
        console.log(`チャットID ${currentChatId} のメッセージを取得`);
        const res = await apiRequest("GET", `/api/messages?chatId=${currentChatId}`);
        return res.json();
      } else {
        console.log("チャットIDなしでメッセージを取得");
        const res = await apiRequest("GET", "/api/messages");
        return res.json();
      }
    },
    enabled: !!user,
  });

  // 新しいチャットを作成
  const createChatMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("ユーザーが認証されていません");
      }
      
      // 日本時間でフォーマット
      const now = new Date();
      // 日本時間のフォーマット (YYYY/MM/DD HH:MM)
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      
      const japanTime = `${year}/${month}/${day} ${hours}:${minutes}`;
      
      const title = `新しいチャット ${japanTime}`;
      console.log(`新しいチャットを作成します: userId=${user.id}, title=${title}`);
      const res = await apiRequest("POST", "/api/chats", {
        userId: user.id,
        title
      });
      return res.json();
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setCurrentChatId(newChat.id);
    }
  });

  // チャットを削除
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: number) => {
      await apiRequest("DELETE", `/api/chats/${chatId}`);
      return chatId;
    },
    onSuccess: (deletedChatId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      if (currentChatId === deletedChatId) {
        setCurrentChatId(null);
      }
    }
  });

  // チャットタイトルを更新
  const updateChatTitleMutation = useMutation({
    mutationFn: async ({ chatId, title }: { chatId: number, title: string }) => {
      await apiRequest("PUT", `/api/chats/${chatId}/title`, { title });
      return { chatId, title };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setIsRenameDialogOpen(false);
      setChatToRename(null);
      setNewChatTitle("");
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) {
        throw new Error("ユーザーが認証されていません");
      }
      
      if (!currentChatId) {
        // チャットがない場合は新規作成
        console.log("新しいチャットを作成します");
        const newChat = await createChatMutation.mutateAsync();
        console.log(`新しいチャット作成: id=${newChat.id}, userId=${user.id}`);
        const res = await apiRequest("POST", "/api/messages", {
          content,
          role: "user",
          userId: user.id,
          chatId: newChat.id
        });
        return res.json();
      } else {
        console.log(`既存のチャットにメッセージを送信: chatId=${currentChatId}, userId=${user.id}`);
        const res = await apiRequest("POST", "/api/messages", {
          content,
          role: "user",
          userId: user.id,
          chatId: currentChatId
        });
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", currentChatId] });
    },
  });

  const handleSendMessage = async (content: string) => {
    await sendMessageMutation.mutateAsync(content);
  };

  const handleCreateNewChat = async () => {
    await createChatMutation.mutateAsync();
  };

  const handleSelectChat = (chatId: number) => {
    setCurrentChatId(chatId);
  };

  const handleDeleteChat = async (chatId: number) => {
    await deleteChatMutation.mutateAsync(chatId);
  };

  const handleRenameChat = (chat: {id: number, title: string}) => {
    setChatToRename(chat);
    setNewChatTitle(chat.title);
    setIsRenameDialogOpen(true);
  };

  const handleRenameChatSubmit = () => {
    if (chatToRename && newChatTitle.trim()) {
      updateChatTitleMutation.mutateAsync({
        chatId: chatToRename.id,
        title: newChatTitle.trim()
      });
    }
  };

  // マウスダウンイベントハンドラ
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // マウス移動イベントハンドラ
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    // 最小幅と最大幅を設定
    if (newWidth > 150 && newWidth < window.innerWidth / 2) {
      setSidebarWidth(newWidth);
    }
  };

  // マウスアップイベントハンドラ
  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // コンポーネントのアンマウント時にイベントリスナーを削除
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="flex h-screen bg-background">
      <div 
        className="border-r overflow-auto flex flex-col" 
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* 可愛い注意メッセージ */}
        <div className="p-4 m-2 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🌟</span>
            <span className="text-pink-600 font-bold text-sm">大切なお知らせ</span>
            <span className="text-2xl">🌟</span>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚫</span>
              <span>患者治療や患者情報に関連することには使用しないでください</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>信頼性が低い回答を出すことがあります</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <span className="text-purple-600 font-medium">業務支援目的でご利用ください</span>
            </div>
          </div>
        </div>
        <button 
          className="m-4 p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 font-medium"
          onClick={handleCreateNewChat}
        >
          <span className="text-lg">💬</span>
          新しいチャット
          <span className="text-lg">✨</span>
        </button>
        <ul className="flex-1 overflow-auto">
          {chats.map((chat) => (
            <li 
              key={chat.id} 
              className={`p-2 border-b hover:bg-gray-100 flex justify-between items-center ${currentChatId === chat.id ? 'bg-gray-100' : ''}`}
            >
              <div 
                className="flex-1 cursor-pointer truncate" 
                onClick={() => handleSelectChat(chat.id)}
              >
                {chat.title}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleRenameChat(chat)}>
                    <Edit className="h-4 w-4 mr-2" />
                    名前変更
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteChat(chat.id)}>
                    <Trash className="h-4 w-4 mr-2" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
        <div className="p-4 border-t space-y-2">
          <div className="text-sm text-gray-500 flex items-center">
            <img 
              src="/ollama-logo.png" 
              alt="Ollama" 
              className="w-6 h-auto mr-2 object-contain" 
              onError={(e) => {
                // 画像が見つからない場合は代替テキストを表示
                e.currentTarget.style.display = 'none';
              }}
            />
            <span>使用中のモデル: {(() => {
              const currentModelInfo = modelsData?.models.find(m => m.model_name === modelName);
              return currentModelInfo ? currentModelInfo.display_name : modelName;
            })()}</span>
          </div>
          <ModelManager />
        </div>
      </div>
      
      {/* リサイズハンドル */}
      <div 
        ref={resizeRef}
        className="w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize flex items-center justify-center"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="h-6 w-6 text-gray-400" />
      </div>
      
      <div className="flex flex-col flex-1">
        <ChatHeader />
        {ollamaError && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{ollamaError}</AlertDescription>
          </Alert>
        )}
        {isError && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>メッセージの取得に失敗しました</AlertDescription>
          </Alert>
        )}
        <div className="flex-1 overflow-hidden relative">
          {!currentChatId && chats.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              左側の「新しいチャット」ボタンをクリックして会話を始めてください
            </div>
          ) : (
            <MessageList 
              messages={messages} 
              isLoading={sendMessageMutation.isPending}
            />
          )}
        </div>
        <div className="border-t bg-background">
          <MessageInput
            onSendMessage={handleSendMessage}
            isLoading={sendMessageMutation.isPending}
            disabled={!!ollamaError && !isModelReady}
          />
        </div>
      </div>

      {/* チャット名変更ダイアログ */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>チャット名の変更</DialogTitle>
            <DialogDescription>
              チャットの新しい名前を入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                名前
              </Label>
              <Input
                id="name"
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleRenameChatSubmit}
              disabled={!newChatTitle.trim() || updateChatTitleMutation.isPending}
            >
              {updateChatTitleMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}