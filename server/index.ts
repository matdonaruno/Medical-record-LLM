import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeLLM } from "./llm";
import dotenv from 'dotenv';
import { storage } from "./storage";
import { createServer } from "http";

// 環境変数を読み込む
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ポート設定
const PORT = process.env.PORT || 3000;

// HTTPサーバーを作成
const httpServer = createServer(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// 利用可能なモデルのリスト
const availableModels = [
  { id: 1, model_name: "llama3:latest", display_name: "Llama 3 8B" },
  { id: 2, model_name: "deepseek-coder:6.7b", display_name: "DeepSeek Coder 6.7B" },
  { id: 3, model_name: "deepseek-r1:7b", display_name: "DeepSeek R1 7B" },
  { id: 4, model_name: "deepscaler:latest", display_name: "DeepScaler" }
];

// 現在のデフォルトモデル
let currentModel = "llama3:latest";

// モデル関連のエンドポイント
app.get("/api/models", (req, res) => {
  res.json({ models: availableModels, currentModel: currentModel });
});

// デフォルトモデルを設定
app.post("/api/models/default", (req, res) => {
  const { model } = req.body;
  if (!model) {
    return res.status(400).json({ error: "モデル名が指定されていません" });
  }
  
  const modelExists = availableModels.some(m => m.model_name === model);
  if (!modelExists) {
    return res.status(400).json({ error: "指定されたモデルは存在しません" });
  }
  
  currentModel = model;
  console.log(`モデルを変更しました: ${currentModel}`);
  res.json({ success: true, currentModel });
});

// アプリケーションの初期化
async function initializeApp() {
  try {
    // LLMの初期化
    await initializeLLM('');
    
    // 現在のデフォルトモデル
    const defaultModel = await storage.getDefaultModel();
    console.log(`現在のデフォルトモデル: ${defaultModel}`);
    
    // デフォルトモデルを設定
    // llama_proが設定されている場合は、llama3:latestに変更
    if (defaultModel === 'llama_pro') {
      await storage.setDefaultModel('llama3:latest');
      console.log('デフォルトモデルをllama3:latestに変更しました');
      currentModel = 'llama3:latest';
    } else {
      currentModel = defaultModel;
    }
    
    // WebSocketルートを登録
    await registerRoutes(app);
    
    // Viteセットアップは開発環境では必要ないのでコメントアウト
    // await setupVite(app, httpServer);
    
    // 静的ファイル配信（修正済みのserveStatic関数を使用）
    serveStatic(app);
    
    // HTTPサーバーを起動
    httpServer.listen(PORT, () => {
      console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${PORT}`);
    });
  } catch (error) {
    console.error('アプリケーションの初期化に失敗しました:', error);
    process.exit(1);
  }
}

// アプリケーションを初期化
initializeApp();