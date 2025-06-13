import { Message } from "@shared/schema";

type WebSocketMessage = {
  type: string;
  data: Message;
};

// グローバルWebSocketインスタンス
let ws: WebSocket | null = null;
const messageHandlers: ((message: WebSocketMessage) => void)[] = [];
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// WebSocket接続を確立する関数
export function connectWebSocket() {
  // 既存の接続があれば閉じる
  if (ws) {
    console.log('既存のWebSocket接続を閉じます');
    ws.close();
    ws = null;
  }

  try {
    // WebSocketのURLを動的に構築
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    
    // Electronモードの検出
    const isElectron = (window as any).electronAPI !== undefined;
    
    // ポートが明示されていない場合、デフォルトポートを使用
    if (!host.includes(':')) {
      // ElectronアプリまたはWebサーバーが動作する標準ポートを推測
      const defaultPort = isElectron 
        ? (window.location.port || '3001')  // Electronでも現在のポートを使用
        : (window.location.port || '3000');  // ウェブ版のデフォルト
      host = `${window.location.hostname}:${defaultPort}`;
    }
    
    const wsUrl = `${protocol}//${host}/api/ws`;

    console.log('WebSocket接続を開始:', wsUrl);
    ws = new WebSocket(wsUrl);

    // 接続イベントハンドラ
    ws.onopen = () => {
      console.log('WebSocket接続が確立されました');
      reconnectAttempts = 0; // 接続成功でリセット
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
      
      // 意図的な切断以外の場合のみ再接続を試みる
      if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // 指数バックオフ
        
        console.log(`WebSocket再接続を試みます (${reconnectAttempts}/${maxReconnectAttempts}) - ${delay}ms後`);
        setTimeout(() => {
          connectWebSocket();
        }, delay);
      } else if (reconnectAttempts >= maxReconnectAttempts) {
        console.log('WebSocket再接続の試行回数が上限に達しました。チャット機能はWebSocketなしで継続します。');
      }
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