import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VoiceInputButton } from "@/components/ui/voice-input-button";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { Send, Loader2, Wifi, WifiOff } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

export default function MessageInput({ onSendMessage, isLoading, disabled }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const { isOfflineCapable } = useSpeechRecognition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    try {
      await onSendMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    // 音声入力の結果をテキストボックスに追加
    setMessage(prev => {
      const newText = prev ? `${prev} ${transcript}` : transcript;
      return newText.trim();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isLoading ? "応答を待っています..." : "メッセージを入力するか、音声ボタンで話してください..."}
            disabled={isLoading || disabled}
            className="pr-2"
          />
        </div>
        
        <VoiceInputButton
          onTranscript={handleVoiceTranscript}
          disabled={isLoading || disabled}
          className="shrink-0"
        />
        
        <Button 
          type="submit" 
          disabled={isLoading || !message.trim() || disabled}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* 音声入力の説明とオフライン対応状況 */}
      <div className="text-xs text-gray-500 mt-2 text-center flex items-center justify-center gap-2">
        <span>🎤 音声ボタンで医療相談を音声入力</span>
        <div className="flex items-center gap-1">
          {isOfflineCapable ? (
            <>
              <WifiOff className="h-3 w-3 text-green-600" />
              <span className="text-green-600 font-medium">完全オフライン対応</span>
            </>
          ) : (
            <>
              <Wifi className="h-3 w-3 text-orange-500" />
              <span className="text-orange-500">インターネット接続推奨</span>
            </>
          )}
        </div>
      </div>
    </form>
  );
}