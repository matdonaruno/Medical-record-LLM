import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  sendMessage: (message: string) => ipcRenderer.invoke('ollama-generate', message),
  onOllamaOutput: (callback: (output: string) => void) => {
    ipcRenderer.on('ollama-output', (_event, output) => callback(output));
  }
});
