import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { spawn, exec } from 'child_process';
import fs from 'fs';

// 開発モードの判定を手動で行う
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Node.js 18以降のfetchを使用、またはnode-fetchをフォールバック
const fetch = globalThis.fetch || require('node-fetch').default;

let mainWindow: BrowserWindow | null = null;
let ollamaProcess: any = null;
let expressServer: any = null;
let serverPort = 3000;

// Ollamaバイナリのパスを取得
function getOllamaPath(): string {
  if (isDev) {
    // 開発環境では既存のOllamaを使用
    return 'ollama';
  } else {
    // 本番環境ではアプリ内のOllamaを使用
    const resourcesPath = process.resourcesPath;
    const platform = process.platform;
    
    if (platform === 'win32') {
      return path.join(resourcesPath, 'bin', 'ollama.exe');
    } else if (platform === 'darwin') {
      return path.join(resourcesPath, 'bin', 'ollama');
    } else {
      return path.join(resourcesPath, 'bin', 'ollama');
    }
  }
}

// モデルディレクトリのパスを取得
function getModelsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'ollama-models');
}

// バンドルされたモデルをコピー（初回起動時）
function copyBundledModels(): void {
  const sourcePath = path.join(process.resourcesPath, 'models');
  const targetPath = getModelsPath();
  
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
    // 実際のサーバーは3000ポートで動作するため固定
    mainWindow?.loadURL(`http://localhost:3000`);
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
      OLLAMA_HOST: '127.0.0.1:11434'
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

    ollamaProcess.stdout?.on('data', (data) => {
      console.log('Ollama stdout:', data.toString());
    });

    ollamaProcess.stderr?.on('data', (data) => {
      console.log('Ollama stderr:', data.toString());
    });

    ollamaProcess.on('error', (error) => {
      console.error('Ollama process error:', error);
      if (mainWindow) {
        mainWindow.webContents.send('ollama-error', error.message);
      }
    });

    // Ollamaが起動するまで待機
    await waitForOllamaReady();
    console.log('Ollama service is ready');

  } catch (error) {
    console.error('Failed to start Ollama:', error);
    if (mainWindow) {
      mainWindow.webContents.send('ollama-error', error.message);
    }
  }
}

// Ollamaの起動確認
async function checkOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags');
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
    const response = await fetch('http://127.0.0.1:11434/api/tags');
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
async function findAvailablePort(startPort: number = 3000): Promise<number> {
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
    
    // Ollamaを起動
    await startOllama();
    
    // Expressサーバーを起動
    await startExpressServer();
    
    // ウィンドウを作成
    createWindow();
    
  } catch (error) {
    console.error('Failed to start application:', error);
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