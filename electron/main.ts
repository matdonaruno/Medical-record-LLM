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
let isAppStarted = false; // 起動制御フラグ

// シングルインスタンス制御
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running. Exiting immediately...');
  process.exit(0); // 即座に終了
}

// 2番目のインスタンスが起動された時の処理
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // 最初のインスタンスのウィンドウをフォーカス
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

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
  
  // プロダクション環境でもシステムのOllamaを探す
  console.log('Bundled Ollama not found, checking system Ollama');
  
  // Windowsの場合、一般的なインストールパスをチェック
  if (platform === 'win32') {
    const possiblePaths = [
      'C:\\Program Files\\Ollama\\ollama.exe',
      'C:\\Program Files (x86)\\Ollama\\ollama.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe'),
      path.join(process.env.APPDATA || '', 'Ollama', 'ollama.exe'),
    ];
    
    for (const ollamaPath of possiblePaths) {
      if (fs.existsSync(ollamaPath)) {
        console.log('Found system Ollama at:', ollamaPath);
        return ollamaPath;
      }
    }
  }
  
  // PATHからollamaコマンドを探す
  try {
    const { execSync } = require('child_process');
    if (platform === 'win32') {
      const result = execSync('where ollama', { encoding: 'utf8' }).trim();
      if (result) {
        console.log('Found Ollama in PATH:', result.split('\n')[0]);
        return result.split('\n')[0];
      }
    } else {
      const result = execSync('which ollama', { encoding: 'utf8' }).trim();
      if (result) {
        console.log('Found Ollama in PATH:', result);
        return result;
      }
    }
  } catch (error) {
    console.log('Ollama not found in PATH');
  }
  
  console.log('Ollama not found anywhere');
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
  // 既にウィンドウが存在する場合は作成しない
  if (mainWindow !== null) {
    console.log('Window already exists, skipping creation');
    return;
  }
  
  try {
    console.log('Creating main window...');
    
    // アイコンファイルの存在確認
    const iconPaths = [
      path.join(__dirname, '../assets/icon.ico'),
      path.join(__dirname, '../icons/icon.ico'),
      path.join(process.resourcesPath, 'icons', 'icon.ico')
    ];
    
    let iconPath = undefined;
    for (const testPath of iconPaths) {
      if (fs.existsSync(testPath)) {
        iconPath = testPath;
        console.log('Found icon at:', iconPath);
        break;
      }
    }
    
    // プリロードスクリプトの存在確認
    const preloadPath = path.join(__dirname, 'preload.cjs');
    if (!fs.existsSync(preloadPath)) {
      console.warn('Preload script not found at:', preloadPath);
    }
    
    const windowOptions: any = {
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: fs.existsSync(preloadPath) ? preloadPath : undefined
      },
      autoHideMenuBar: true, // メニューバーを非表示
      show: false // 初期状態では非表示
    };
    
    // アイコンが見つかった場合のみ設定
    if (iconPath) {
      windowOptions.icon = iconPath;
    }
    
    mainWindow = new BrowserWindow(windowOptions);

    // ウィンドウ準備完了後に表示
    mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      mainWindow?.show();
    });

    // サーバーが起動するまで待機してからロード
    waitForServerReady().then(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const serverUrl = `http://${electronConfig.server.host}:${serverPort}`;
        console.log('Loading URL:', serverUrl);
        mainWindow.loadURL(serverUrl).catch((error) => {
          console.error('Failed to load URL:', error);
          dialog.showErrorBox('URL Load Error', `Failed to load application: ${error.message}`);
        });
        
        if (isDev) {
          mainWindow.webContents.openDevTools();
        }
      }
    }).catch((error) => {
      console.error('Server failed to start:', error);
      dialog.showErrorBox('Server Error', `Failed to start server: ${error.message}`);
    });

    mainWindow.on('closed', () => {
      console.log('Main window closed');
      mainWindow = null;
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Page failed to load:', errorCode, errorDescription);
    });

  } catch (error) {
    console.error('Error creating window:', error);
    dialog.showErrorBox('Window Creation Error', `Failed to create window: ${error.message}`);
    cleanup();
    process.exit(1);
  }
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
        expressServer = spawn('tsx', ['server/index.ts'], {
          env: { ...process.env, ELECTRON_MODE: 'true', PORT: serverPort.toString() },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        const serverProcess = expressServer;
        
        serverProcess.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('Server:', output);
          if (output.includes('serving on port') || output.includes('Server started')) {
            console.log('Dev server startup detected, resolving...');
            setTimeout(() => resolve(true), 2000); // 2秒の猶予
          }
        });
        
        serverProcess.stderr.on('data', (data) => {
          const errorOutput = data.toString();
          console.error('Dev Server Error:', errorOutput);
          // エラーでもサーバーが起動する場合があるので、即座にrejectしない
        });
        
        serverProcess.on('error', (error) => {
          console.error('Failed to start dev server process:', error);
          reject(error);
        });
        
        serverProcess.on('exit', (code) => {
          console.log('Dev server process exited with code:', code);
          if (code !== 0) {
            reject(new Error(`Dev server process exited with code ${code}`));
          }
        });
        
        // 20秒後にタイムアウト
        setTimeout(() => {
          console.log('Dev server startup timeout, but continuing...');
          resolve(true);
        }, 20000);
        
      } else {
        // 本番環境では子プロセスでサーバーを起動
        const { spawn } = require('child_process');
        
        // サーバーファイルの場所を複数試行
        const possibleServerPaths = [
          path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'server', 'index.js'),
          path.join(__dirname, '..', 'dist', 'server', 'index.js'),
          path.join(__dirname, '..', 'server', 'index.js'), 
          path.join(process.resourcesPath, 'app.asar', 'dist', 'server', 'index.js'),
          path.join(process.resourcesPath, 'app.asar', 'server', 'index.js')
        ];
        
        let serverPath = null;
        for (const testPath of possibleServerPaths) {
          if (fs.existsSync(testPath)) {
            serverPath = testPath;
            console.log('Found server at:', serverPath);
            break;
          }
        }
        
        if (!serverPath) {
          console.error('Server file not found. Checked paths:', possibleServerPaths);
          reject(new Error('Server file not found'));
          return;
        }
        
        expressServer = spawn(process.execPath, [serverPath], {
          env: { ...process.env, ELECTRON_MODE: 'true', PORT: serverPort.toString() },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        const serverProcess = expressServer;
        
        serverProcess.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('Server STDOUT:', output);
          if (output.includes('serving on port') || output.includes('Server started') || output.includes('[express] serving on port')) {
            console.log('Production server startup detected, resolving...');
            setTimeout(() => resolve(true), 2000); // 2秒の猶予
          }
        });
        
        serverProcess.stderr.on('data', (data) => {
          const errorOutput = data.toString();
          console.error('Production Server Error:', errorOutput);
          // エラーでもサーバーが起動する場合があるので、即座にrejectしない
        });
        
        serverProcess.on('error', (error) => {
          console.error('Failed to start production server process:', error);
          reject(error);
        });
        
        serverProcess.on('exit', (code) => {
          console.log('Production server process exited with code:', code);
          if (code !== 0) {
            reject(new Error(`Production server process exited with code ${code}`));
          }
        });
        
        // 20秒後にタイムアウト
        setTimeout(() => {
          console.log('Production server startup timeout, but continuing...');
          resolve(true);
        }, 20000);
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
  
  // プロセスをクリーンアップしてアプリを終了
  cleanup();
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

// サーバーが準備完了まで待機
async function waitForServerReady(maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://${electronConfig.server.host}:${serverPort}/api/health`);
      if (response.ok) {
        console.log('Server is ready');
        return;
      }
    } catch (error) {
      console.log(`Waiting for server... attempt ${i + 1}/${maxRetries}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Server failed to start within timeout');
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
async function findAvailablePort(startPort: number = electronConfig.server.port, maxTries: number = 100): Promise<number> {
  for (let port = startPort; port < startPort + maxTries; port++) {
    try {
      const available = await checkPortAvailable(port);
      if (available) {
        return port;
      }
    } catch (error) {
      console.log(`Port ${port} is not available, trying next...`);
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + maxTries}`);
}

// ポートが利用可能かチェック
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

// メイン起動処理
async function startMainApp() {
  try {
    // 二重起動防止
    if (isAppStarted) {
      console.log('App already started, ignoring...');
      return;
    }
    isAppStarted = true;
    
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
        console.error('Ollama not found, exiting...');
        dialog.showMessageBoxSync({
          type: 'error',
          title: 'Ollama not found',
          message: 'Ollamaが見つかりません',
          detail: 'Medical Record LLMにバンドルされたOllamaが見つかりません。\n\n配布パッケージが正しくインストールされているか確認してください。',
          buttons: ['OK']
        });
        
        cleanup();
        process.exit(1); // 即座に終了
      }
    }
    
    // Expressサーバーを最初に起動
    console.log('Starting Express server...');
    await startExpressServer();
    
    // Ollamaを並行して起動（バックグラウンド）
    console.log('Starting Ollama...');
    startOllama().catch((error) => {
      console.warn('Ollama startup failed, but continuing:', error);
      // Ollamaの起動失敗は警告のみ、アプリは継続
    });
    
    // ウィンドウを作成
    console.log('Creating window...');
    createWindow();
    
    console.log('App started successfully');
    
  } catch (error: any) {
    console.error('CRITICAL ERROR - Failed to start application:', error);
    
    // エラー詳細をログに出力
    console.error('Error stack:', error.stack);
    
    try {
      dialog.showErrorBox('起動エラー', `アプリケーションの起動に失敗しました:\n${error.message}\n\nアプリケーションを終了します。`);
    } catch (dialogError) {
      console.error('Failed to show error dialog:', dialogError);
    }
    
    cleanup();
    process.exit(1); // 即座に終了
  }
}

// プロセスクリーンアップ
function cleanup() {
  console.log('Cleaning up processes...');
  
  if (ollamaProcess && !ollamaProcess.killed) {
    console.log('Terminating Ollama process...');
    ollamaProcess.kill('SIGTERM');
    ollamaProcess = null;
  }
  
  if (expressServer && !expressServer.killed) {
    console.log('Terminating Express server...');
    expressServer.kill('SIGTERM');
    expressServer = null;
  }
}

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  cleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  cleanup();
  process.exit(1);
});

// シングルインスタンスの場合のみ起動
console.log('Got the lock:', gotTheLock);
app.whenReady().then(async () => {
  try {
    console.log('Electron app ready');
    await startMainApp();
  } catch (error) {
    console.error('Error in app ready handler:', error);
    cleanup();
    process.exit(1);
  }
}).catch((error) => {
  console.error('Error in app.whenReady():', error);
  cleanup();
  process.exit(1);
});

app.on('activate', () => {
  try {
    console.log('App activate event');
    if (mainWindow === null && isAppStarted) {
      // Only create window if app has been started and window was closed
      createWindow();
    }
  } catch (error) {
    console.error('Error in activate handler:', error);
    cleanup();
    process.exit(1);
  }
});

app.on('window-all-closed', () => {
  // すべてのプロセスをクリーンアップ
  cleanup();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // アプリ終了前のクリーンアップ
  cleanup();
});

// 強制終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up...');
  cleanup();
  process.exit(0);
});