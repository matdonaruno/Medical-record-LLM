import { useAuth } from "@/hooks/use-auth";
import ChatHeader from "@/components/chat/chat-header";
import MessageList from "@/components/chat/message-list";
import MessageInput from "@/components/chat/message-input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Message } from "@shared/schema";
import { useEffect, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        content,
        role: "user",
        userId: user!.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    };

    setSocket(ws);

    // Listen for Ollama events from Electron
    if (window.electron) {
      window.electron.onOllamaOutput((output: string) => {
        console.log('Ollama output:', output);
      });

      window.electron.onOllamaError((error: string) => {
        setOllamaError(error);
      });

      window.electron.onModelReady(() => {
        setIsModelReady(true);
        setOllamaError(null);
      });
    }

    return () => {
      ws.close();
    };
  }, []);

  const handleSendMessage = async (content: string) => {
    await sendMessageMutation.mutateAsync(content);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      {ollamaError && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{ollamaError}</AlertDescription>
        </Alert>
      )}
      <div className="flex-1 overflow-hidden relative">
        <MessageList 
          messages={messages} 
          isLoading={sendMessageMutation.isPending}
        />
      </div>
      <div className="border-t bg-background">
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending}
          disabled={!!ollamaError && !isModelReady}
        />
      </div>
    </div>
  );
}