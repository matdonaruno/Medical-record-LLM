import { Message } from "@shared/schema";

type WebSocketMessage = {
  type: string;
  data: Message;
};

// グローバルWebSocketインスタンス
let ws: WebSocket | null = null;
const messageHandlers: ((message: WebSocketMessage) => void)[] = [];

// WebSocket接続を確立する関数
export function connectWebSocket() {
  // 既存の接続があれば閉じる
  if (ws) {
    console.log('既存のWebSocket接続を閉じます');
    ws.close();
    ws = null;
  }

  try {
    // WebSocketのURLを構築
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    const wsUrl = `${protocol}//${host}/api/ws`;

    console.log('WebSocket接続を開始:', wsUrl);
    ws = new WebSocket(wsUrl);

    // 接続イベントハンドラ
    ws.onopen = () => {
      console.log('WebSocket接続が確立されました');
    };

    // メッセージ受信ハンドラ
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        messageHandlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('WebSocketメッセージの解析エラー:', error);
      }
    };

    // エラーハンドラ
    ws.onerror = (error) => {
      console.error('WebSocketエラー:', error);
    };

    // 接続終了ハンドラ
    ws.onclose = (event) => {
      console.log('WebSocket接続が閉じられました:', event.code, event.reason);
      ws = null;
      
      // 3秒後に再接続を試みる
      setTimeout(() => {
        console.log('WebSocket再接続を試みます');
        connectWebSocket();
      }, 3000);
    };
  } catch (error) {
    console.error('WebSocket接続の作成に失敗しました:', error);
    ws = null;
  }
}

// メッセージハンドラを登録する関数
export function addMessageHandler(handler: (message: WebSocketMessage) => void) {
  messageHandlers.push(handler);
  return () => {
    const index = messageHandlers.indexOf(handler);
    if (index !== -1) {
      messageHandlers.splice(index, 1);
    }
  };
}

// WebSocket接続を閉じる関数
export function closeWebSocket() {
  if (ws) {
    console.log('WebSocket接続を閉じます');
    ws.close();
    ws = null;
  }
}

// WebSocketの状態を取得する関数
export function getWebSocketState(): number {
  if (!ws) return WebSocket.CLOSED;
  return ws.readyState;
} 