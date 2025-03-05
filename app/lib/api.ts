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
 * 注意: 現在は使用しないでください - client/src/lib/websocket.tsを使用してください
 */
export function createWebSocketClient(
  onMessage: (message: Message) => void,
  onError: (error: Event) => void
): WebSocket {
  console.warn('この関数は非推奨です。client/src/lib/websocket.tsを使用してください');
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:3000';
  const wsUrl = `${protocol}//${host}/api/ws`;
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