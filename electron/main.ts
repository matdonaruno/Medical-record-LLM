import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null = null;
let ollamaProcess: any = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/public/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startOllama() {
  try {
    // Check if Ollama is already running
    const checkProcess = spawn('ollama', ['list']);
    let isOllamaRunning = false;

    await new Promise((resolve) => {
      checkProcess.on('error', () => resolve(false));
      checkProcess.on('close', (code) => resolve(code === 0));
      setTimeout(() => resolve(false), 2000); // Timeout after 2s
    });

    if (!isOllamaRunning) {
      console.log('Starting Ollama service...');
      ollamaProcess = spawn('ollama', ['serve']);

      // Wait for Ollama to start
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Pull Llama model in background
    console.log('Pulling Llama model...');
    const pullProcess = spawn('ollama', ['pull', 'llama3']);

    pullProcess.stdout.on('data', (data) => {
      console.log('Pull progress:', data.toString());
      if (mainWindow) {
        mainWindow.webContents.send('model-progress', data.toString());
      }
    });

    // Don't wait for pull to complete, let it run in background
    pullProcess.on('close', (code) => {
      console.log('Model pull completed with code:', code);
      if (mainWindow) {
        mainWindow.webContents.send('model-ready', true);
      }
    });

  } catch (error) {
    console.error('Failed to start Ollama:', error);
    if (mainWindow) {
      mainWindow.webContents.send('ollama-error', error.message);
    }
  }
}

// Handle Ollama communication
ipcMain.handle('ollama-generate', async (_event, message: string) => {
  try {
    // Use simple echo response if model is not ready
    if (!ollamaProcess) {
      return `[Development Mode] Echo: ${message}`;
    }

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: message,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama API error:', error);
    return `[Error] Could not generate response: ${error.message}. Running in fallback mode.`;
  }
});

app.whenReady().then(async () => {
  createWindow();
  startOllama().catch(console.error); // Start Ollama in background

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }

  // Cleanup Ollama process
  if (ollamaProcess) {
    ollamaProcess.kill();
  }
});