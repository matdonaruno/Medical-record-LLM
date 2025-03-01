import { Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import LoadingBubble from "./loading-bubble";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // スクロールイベントを監視して、最下部からの距離に応じてボタンの表示/非表示を切り替え
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    // 最下部から100px以上離れている場合にボタンを表示
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // 最下部にスクロールする関数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative h-[calc(100vh-8rem)]">
      <div 
        className="h-full p-4 overflow-auto"
        ref={scrollAreaRef}
        onScroll={handleScroll}
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <Card
              key={message.id}
              className={`p-4 max-w-[80%] ${
                message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto"
              }`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium mb-1">
                  {message.role === "user" ? user?.username : "Assistant"}
                </span>
                <p className="whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-2">
                  {format(new Date(message.timestamp), "MM/dd HH:mm")}
                </span>
              </div>
            </Card>
          ))}
          {isLoading && (
            <Card className="p-4 max-w-[80%] mr-auto">
              <div className="flex flex-col">
                <span className="text-sm font-medium mb-1">Assistant</span>
                <LoadingBubble />
              </div>
            </Card>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* 最下部へスクロールするボタン */}
      {showScrollButton && (
        <Button
          className="absolute bottom-4 right-4 rounded-full w-10 h-10 p-0 shadow-md"
          onClick={scrollToBottom}
          variant="secondary"
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}