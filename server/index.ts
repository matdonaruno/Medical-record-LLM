import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeLLM, getAvailableModels } from "./llm";
import dotenv from 'dotenv';
import { storage } from "./storage";
import { createServer } from "http";

// 環境変数を読み込む
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ポート設定
const PORT = process.env.PORT || 3001;

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

// 利用可能なモデルのリスト（動的に取得）

// 現在のデフォルトモデル（医療用途に特化されたMedGemmaを使用）
let currentModel = "alibayram/medgemma";

// モデル関連のエンドポイント
app.get("/api/models", async (req, res) => {
  try {
    const models = await getAvailableModels();
    res.json({ models: models, currentModel: currentModel });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'モデル一覧の取得に失敗しました' });
  }
});

// デフォルトモデルを設定
app.post("/api/models/default", async (req, res) => {
  const { modelName } = req.body;
  if (!modelName) {
    return res.status(400).json({ error: "モデル名が指定されていません" });
  }
  
  try {
    // Ollamaから利用可能なモデルを取得して存在確認
    const availableModels = await getAvailableModels();
    const modelExists = availableModels.some((m: any) => m.model_name === modelName);
    
    if (!modelExists) {
      return res.status(400).json({ error: "指定されたモデルは存在しません" });
    }
    
    currentModel = modelName;
    console.log(`モデルを変更しました: ${currentModel}`);
    res.json({ success: true, currentModel });
  } catch (error) {
    console.error('Error setting default model:', error);
    res.status(500).json({ error: 'モデルの設定に失敗しました' });
  }
});

// アプリケーションの初期化
async function initializeApp() {
  try {
    // Electronモードかどうかを判定
    const isElectronMode = process.env.ELECTRON_MODE === 'true';
    
    // LLMの初期化（Electronモードの場合はOllamaチェックをスキップ）
    await initializeLLM('', isElectronMode);
    
    // 現在のデフォルトモデル
    try {
      const defaultModel = await storage.getDefaultModel();
      console.log(`現在のデフォルトモデル: ${defaultModel}`);
      
      // デフォルトモデルを設定
      // 古いモデルが設定されている場合は、MedGemmaに変更
      if (defaultModel === 'llama_pro' || defaultModel === 'llama3:latest' || defaultModel === 'gemma3:latest') {
        await storage.setDefaultModel('alibayram/medgemma');
        console.log('デフォルトモデルをalibayram/medgemmaに変更しました（医療用途に特化）');
        currentModel = 'alibayram/medgemma';
      } else {
        currentModel = defaultModel;
      }
    } catch (error) {
      console.warn('デフォルトモデルの取得に失敗しましたが、続行します:', error);
      currentModel = 'alibayram/medgemma';
    }
    
    // WebSocketルートを登録（既存のHTTPサーバーを渡す）
    await registerRoutes(app, httpServer);
    
    // 静的ファイル配信
    serveStatic(app);
    
    // HTTPサーバーを起動
    httpServer.listen(PORT, () => {
      console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${PORT}`);
      
      // Electronモードでない場合はブラウザで開く
      if (!isElectronMode) {
        console.log(`Open browser: http://localhost:${PORT}`);
      }
    });
  } catch (error) {
    console.error('アプリケーションの初期化に失敗しました:', error);
    // Electronモードでは致命的エラーにしない
    if (process.env.ELECTRON_MODE === 'true') {
      console.warn('Electronモードで初期化エラーが発生しましたが、続行します');
      
      // WebSocketルートを登録（既存のHTTPサーバーを渡す）
      await registerRoutes(app, httpServer);
      serveStatic(app);
      
      // HTTPサーバーを起動
      httpServer.listen(PORT, () => {
        console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${PORT} (Electron mode with warnings)`);
      });
    } else {
      process.exit(1);
    }
  }
}

// アプリケーションを初期化
initializeApp();