import { contextBridge, ipcRenderer } from 'electron';

// ElectronのAPIをレンダラープロセスに安全に公開
contextBridge.exposeInMainWorld('electronAPI', {
  // モデル管理
  getModelsPath: () => ipcRenderer.invoke('get-models-path'),
  importModel: (filePath: string) => ipcRenderer.invoke('import-model', filePath),
  selectModelFile: () => ipcRenderer.invoke('select-model-file'),
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  
  // アプリ情報
  getAppVersion: () => process.env.npm_package_version || '1.0.0',
  getPlatform: () => process.platform,
  
  // イベントリスナー
  onModelProgress: (callback: (progress: string) => void) => {
    ipcRenderer.on('model-progress', (_event, progress) => callback(progress));
  },
  onModelReady: (callback: (ready: boolean) => void) => {
    ipcRenderer.on('model-ready', (_event, ready) => callback(ready));
  },
  onOllamaError: (callback: (error: string) => void) => {
    ipcRenderer.on('ollama-error', (_event, error) => callback(error));
  },
  
  // リスナーの削除
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// 後方互換性のために既存のAPIも維持（現在は未使用）
contextBridge.exposeInMainWorld('electron', {
  sendMessage: (message: string) => Promise.resolve(`Echo: ${message}`), // プレースホルダー実装
  onOllamaOutput: (callback: (output: string) => void) => {
    // 現在は使用されていないため、何もしない
    console.log('onOllamaOutput callback registered but not implemented');
  }
});
