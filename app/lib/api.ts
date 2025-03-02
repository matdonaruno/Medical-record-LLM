import { ApiResponse, ChatResponse, Message } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * 基本的なAPIリクエストを行う関数
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    return {
      data,
      status: response.status,
    };
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    return {
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      status: 500,
    };
  }
}

/**
 * チャットメッセージを送信する
 */
export async function sendChatMessage(message: string): Promise<ApiResponse<ChatResponse>> {
  return fetchApi<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/**
 * WebSocketクライアントを作成する
 */
export function createWebSocketClient(
  onMessage: (message: Message) => void,
  onError: (error: Event) => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  const ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'response') {
        onMessage({
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('WebSocket message parsing error:', error);
    }
  };
  
  ws.onerror = onError;
  
  return ws;
} 