/**
 * アプリケーション設定の統一管理
 * ハードコーディングを排除し、環境変数から設定を読み込む
 */

export interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  ollama: {
    host: string;
    port: number;
    baseUrl: string;
  };
  websocket: {
    baseUrl: string;
  };
  database: {
    url: string;
  };
  electron: {
    serverPort: number;
    serverUrl: string;
  };
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config: AppConfig = {
  server: {
    port: getEnvNumber('PORT', 3001),
    host: getEnvString('HOST', 'localhost'),
  },
  ollama: {
    host: getEnvString('OLLAMA_HOST', 'localhost'),
    port: getEnvNumber('OLLAMA_PORT', 11434),
    get baseUrl() {
      return `http://${this.host}:${this.port}`;
    },
  },
  websocket: {
    get baseUrl() {
      return `ws://${config.server.host}:${config.server.port}`;
    },
  },
  database: {
    url: getEnvString('DATABASE_URL', 'postgresql://localhost:5432/medical_record'),
  },
  electron: {
    get serverPort() {
      return config.server.port;
    },
    get serverUrl() {
      return `http://${config.server.host}:${config.server.port}`;
    },
  },
};

// 設定の妥当性チェック
export function validateConfig(): void {
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error(`Invalid server port: ${config.server.port}`);
  }
  
  if (config.ollama.port < 1 || config.ollama.port > 65535) {
    throw new Error(`Invalid Ollama port: ${config.ollama.port}`);
  }
  
  if (!config.database.url) {
    throw new Error('DATABASE_URL is required');
  }
}

// デバッグ用設定表示
export function logConfig(): void {
  console.log('📝 Application Configuration:');
  console.log(`  Server: ${config.server.host}:${config.server.port}`);
  console.log(`  Ollama: ${config.ollama.baseUrl}`);
  console.log(`  WebSocket: ${config.websocket.baseUrl}`);
  console.log(`  Database: ${config.database.url.replace(/:[^@]*@/, ':***@')}`); // パスワードをマスク
}