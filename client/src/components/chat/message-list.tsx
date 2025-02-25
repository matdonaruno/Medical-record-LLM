import { Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import LoadingBubble from "./loading-bubble";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const { user } = useAuth();

  return (
    <ScrollArea className="h-full p-4">
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
                {format(new Date(message.timestamp), "HH:mm")}
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
      </div>
    </ScrollArea>
  );
}