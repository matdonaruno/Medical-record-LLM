import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { spawn, exec, ChildProcess } from 'child_process';
import * as fs from 'fs';

// 開発モードの判定を手動で行う
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Node.js 18以降のfetchを使用、またはnode-fetchをフォールバック
const fetch = globalThis.fetch || require('node-fetch').default;

// Electron設定（環境変数から取得）
const electronConfig = {
  server: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || 'localhost',
  },
  ollama: {
    host: process.env.OLLAMA_HOST || '127.0.0.1',
    port: parseInt(process.env.OLLAMA_PORT || '11434'),
    get baseUrl() {
      return `http://${this.host}:${this.port}`;
    },
  },
};

let mainWindow: BrowserWindow | null = null;
let ollamaProcess: ChildProcess | null = null;
let expressServer: ChildProcess | null = null;
let serverPort = electronConfig.server.port;

// Ollamaバイナリのパスを取得
function getOllamaPath(): string | null {
  const platform = process.platform;
  const resourcesPath = process.resourcesPath;
  
  // バンドルされたOllamaを優先的に使用
  let bundledPath: string;
  
  if (platform === 'win32') {
    bundledPath = path.join(resourcesPath, 'ollama', 'ollama.exe');
  } else if (platform === 'darwin') {
    bundledPath = path.join(resourcesPath, 'ollama', 'ollama');
  } else {
    bundledPath = path.join(resourcesPath, 'ollama', 'ollama');
  }
  
  console.log('Checking for bundled Ollama at:', bundledPath);
  
  if (fs.existsSync(bundledPath)) {
    console.log('Found bundled Ollama');
    
    // Unix系OSでは実行権限を確認・設定
    if (platform !== 'win32') {
      try {
        const stats = fs.statSync(bundledPath);
        const hasExecutePermission = !!(stats.mode & parseInt('0100', 8));
        
        if (!hasExecutePermission) {
          console.log('Setting execute permission for Ollama binary');
          fs.chmodSync(bundledPath, 0o755);
        }
      } catch (error) {
        console.warn('Failed to check/set execute permission:', error);
      }
    }
    
    return bundledPath;
  }
  
  // 開発環境ではシステムのOllamaを使用
  if (isDev) {
    console.log('Development mode: using system Ollama');
    return 'ollama';
  }
  
  console.log('Bundled Ollama not found');
  return null;
}

// モデルディレクトリのパスを取得
function getModelsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'ollama-models');
}

// バンドルされたモデルをコピー（初回起動時）
function copyBundledModels(): void {
  const sourcePath = path.join(process.resourcesPath, 'ollama-models');
  const targetPath = getModelsPath();
  
  console.log('Checking for bundled models at:', sourcePath);
  
  // ソースディレクトリが存在しない場合はスキップ
  if (!fs.existsSync(sourcePath)) {
    console.log('No bundled models found');
    return;
  }
  
  // ターゲットディレクトリを作成
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
  
  // モデルファイルをコピー
  console.log('Copying bundled models...');
  try {
    const copyRecursive = (src: string, dest: string) => {
      const stats = fs.statSync(src);
      if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(file => {
          copyRecursive(path.join(src, file), path.join(dest, file));
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    copyRecursive(sourcePath, targetPath);
    console.log('Bundled models copied successfully');
  } catch (error) {
    console.error('Error copying bundled models:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../assets/icon.ico'), // アイコンを追加
    autoHideMenuBar: true // メニューバーを非表示
  });

  // サーバー起動後にロード
  setTimeout(() => {
    // 設定されたサーバーURLを使用
    mainWindow?.loadURL(`http://${electronConfig.server.host}:${electronConfig.server.port}`);
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  }, 2000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Expressサーバーを起動
async function startExpressServer() {
  return new Promise((resolve, reject) => {
    try {
      // Electronモードフラグを設定
      process.env.ELECTRON_MODE = 'true';
      
      // サーバーモジュールを動的にインポート
      if (isDev) {
        // 開発環境では子プロセスでサーバーを起動
        const { spawn } = require('child_process');
        const serverProcess = spawn('tsx', ['server/index.ts'], {
          env: { ...process.env, ELECTRON_MODE: 'true' },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        serverProcess.stdout.on('data', (data) => {
          console.log('Server:', data.toString());
          if (data.toString().includes('serving on port')) {
            resolve(true);
          }
        });
        
        serverProcess.stderr.on('data', (data) => {
          console.error('Server Error:', data.toString());
        });
        
        serverProcess.on('error', (error) => {
          console.error('Failed to start server process:', error);
          reject(error);
        });
        
        // 10秒後にタイムアウト
        setTimeout(() => resolve(true), 10000);
        
      } else {
        // 本番環境では直接インポート
        require('../dist/server/index.js');
        console.log('Express server started');
        resolve(true);
      }
    } catch (error) {
      console.error('Failed to start Express server:', error);
      reject(error);
    }
  });
}

async function startOllama() {
  try {
    const ollamaPath = getOllamaPath();
    
    if (!ollamaPath) {
      throw new Error('Ollamaが見つかりません。Ollamaをインストールしてください。');
    }
    
    const modelsPath = getModelsPath();
    
    // モデルディレクトリを作成
    if (!fs.existsSync(modelsPath)) {
      fs.mkdirSync(modelsPath, { recursive: true });
      // バンドルされたモデルをコピー
      copyBundledModels();
    }

    // 環境変数を設定
    const env = {
      ...process.env,
      OLLAMA_MODELS: modelsPath,
      OLLAMA_HOST: `${electronConfig.ollama.host}:${electronConfig.ollama.port}`
    };

    console.log('Starting Ollama service...');
    console.log('Ollama path:', ollamaPath);
    console.log('Models path:', modelsPath);

    // Ollamaが既に実行中かチェック
    const isRunning = await checkOllamaRunning();
    if (isRunning) {
      console.log('Ollama is already running');
      return;
    }

    // Ollamaサーバーを起動
    ollamaProcess = spawn(ollamaPath, ['serve'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    ollamaProcess.stdout?.on('data', (data: Buffer) => {
      console.log('Ollama stdout:', data.toString());
    });

    ollamaProcess.stderr?.on('data', (data: Buffer) => {
      console.log('Ollama stderr:', data.toString());
    });

    ollamaProcess.on('error', (error: Error) => {
      console.error('Ollama process error:', error);
      const message = error.message.includes('ENOENT') 
        ? 'Ollamaが見つかりません。Ollamaをインストールしてください。'
        : `Ollamaの起動に失敗しました: ${error.message}`;
      showOllamaError(message);
    });

    // Ollamaが起動するまで待機
    await waitForOllamaReady();
    console.log('Ollama service is ready');

  } catch (error: any) {
    console.error('Failed to start Ollama:', error);
    showOllamaError(error.message || 'Ollamaの起動に失敗しました');
  }
}

// Ollamaエラーを表示
function showOllamaError(message: string) {
  dialog.showMessageBoxSync({
    type: 'error',
    title: 'Ollama Error',
    message: 'Ollamaの起動に失敗しました',
    detail: message + '\n\n配布パッケージに含まれるOllamaが正しくインストールされているか確認してください。',
    buttons: ['OK']
  });
  
  // アプリを終了
  app.quit();
}

// Ollamaの起動確認
async function checkOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${electronConfig.ollama.baseUrl}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

// Ollamaが準備完了まで待機
async function waitForOllamaReady(maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    if (await checkOllamaRunning()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Ollama failed to start within timeout');
}

// モデル管理のIPCハンドラー
ipcMain.handle('get-models-path', () => {
  return getModelsPath();
});

ipcMain.handle('import-model', async (_event, filePath: string) => {
  try {
    const modelsPath = getModelsPath();
    const fileName = path.basename(filePath);
    const targetPath = path.join(modelsPath, fileName);
    
    // ファイルをコピー
    fs.copyFileSync(filePath, targetPath);
    
    return { success: true, path: targetPath };
  } catch (error) {
    console.error('Model import error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-model-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [
      { name: 'Model files', extensions: ['gguf', 'bin'] },
      { name: 'All files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  
  return result.filePaths[0];
});

ipcMain.handle('get-available-models', async () => {
  try {
    const response = await fetch(`${electronConfig.ollama.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('Get models error:', error);
    return [];
  }
});

// 利用可能な空きポートを見つける
async function findAvailablePort(startPort: number = electronConfig.server.port): Promise<number> {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

app.whenReady().then(async () => {
  try {
    console.log('Starting Medical Record LLM...');
    
    // 利用可能なポートを見つける
    serverPort = await findAvailablePort();
    console.log(`Using port: ${serverPort}`);
    
    // 環境変数を設定
    process.env.PORT = serverPort.toString();
    
    // Ollamaの状態をチェック
    const isOllamaRunning = await checkOllamaRunning();
    if (!isOllamaRunning) {
      const ollamaPath = getOllamaPath();
      if (!ollamaPath) {
        dialog.showMessageBoxSync({
          type: 'error',
          title: 'Ollama not found',
          message: 'Ollamaが見つかりません',
          detail: 'Medical Record LLMにバンドルされたOllamaが見つかりません。\n\n配布パッケージが正しくインストールされているか確認してください。',
          buttons: ['OK']
        });
        
        app.quit();
        return;
      }
    }
    
    // Ollamaを起動
    await startOllama();
    
    // Expressサーバーを起動
    await startExpressServer();
    
    // ウィンドウを作成
    createWindow();
    
  } catch (error: any) {
    console.error('Failed to start application:', error);
    dialog.showErrorBox('起動エラー', `アプリケーションの起動に失敗しました:\n${error.message}`);
    app.quit();
  }

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // すべてのプロセスをクリーンアップ
  if (ollamaProcess) {
    console.log('Terminating Ollama process...');
    ollamaProcess.kill('SIGTERM');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // アプリ終了前のクリーンアップ
  if (ollamaProcess) {
    ollamaProcess.kill('SIGTERM');
  }
});