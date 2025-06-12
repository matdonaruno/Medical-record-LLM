import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInputButton({ onTranscript, disabled, className }: VoiceInputButtonProps) {
  const {
    isSupported,
    isListening,
    transcript,
    error,
    isOfflineCapable,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
      resetTranscript();
    }
  }, [transcript, onTranscript, resetTranscript]);

  useEffect(() => {
    if (isListening) {
      setPulseAnimation(true);
      const interval = setInterval(() => {
        setPulseAnimation(prev => !prev);
      }, 800);
      return () => clearInterval(interval);
    } else {
      setPulseAnimation(false);
    }
  }, [isListening]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return null; // 音声認識がサポートされていない場合は非表示
  }

  return (
    <div className="flex flex-col items-center">
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "relative transition-all duration-200",
          isListening && "animate-pulse bg-red-500 hover:bg-red-600",
          pulseAnimation && "scale-110",
          className
        )}
        title={
          isListening 
            ? "音声入力を停止" 
            : `音声入力を開始${isOfflineCapable ? ' (オフライン対応)' : ' (要インターネット)'}`
        }
      >
        {isListening ? (
          <>
            <MicOff className="h-4 w-4 mr-1" />
            <span className="text-xs">停止</span>
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 mr-1" />
            <span className="text-xs">音声</span>
          </>
        )}
        
        {isListening && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
        )}
      </Button>
      
      {error && (
        <span className="text-xs text-red-500 mt-1 max-w-20 text-center">
          音声認識エラー
        </span>
      )}
      
      {isListening && (
        <span className="text-xs text-blue-500 mt-1 animate-pulse">
          聞いています...
        </span>
      )}
    </div>
  );
}