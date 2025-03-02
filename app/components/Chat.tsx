'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { sendChatMessage, createWebSocketClient } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // WebSocketの接続を設定
  useEffect(() => {
    const handleWebSocketMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
      setIsLoading(false);
    };

    const handleWebSocketError = (error: Event) => {
      console.error('WebSocket error:', error);
      setIsLoading(false);
    };

    const ws = createWebSocketClient(handleWebSocketMessage, handleWebSocketError);
    
    setSocket(ws);
    
    return () => {
      ws.close();
    };
  }, []);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // フォールバックとしてREST APIを使用
  const sendMessageFallback = async (message: string) => {
    try {
      const response = await sendChatMessage(message);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.data) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.response,
          timestamp: response.data.timestamp
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // エラーメッセージを表示
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'すみません、エラーが発生しました。後でもう一度お試しください。',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // メッセージを送信
  const sendMessage = () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = { 
      role: 'user', 
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');
    
    // WebSocketが接続されていればそれを使用、そうでなければREST APIを使用
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'chat',
        message: input
      }));
    } else {
      sendMessageFallback(input);
    }
  };

  // Enterキーでメッセージを送信
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">医療相談チャットボット</CardTitle>
      </CardHeader>
      <CardContent className="h-[60vh] overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 my-8">
            何か質問してみましょう
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-200 text-gray-800">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="border-t p-4">
        <div className="flex w-full space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="何か質問はありますか？"
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            fullWidth
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading}
            variant="primary"
          >
            送信
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 