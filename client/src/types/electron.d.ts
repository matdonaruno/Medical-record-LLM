interface Window {
  electronAPI?: {
    getModelsPath: () => Promise<string>;
    importModel: (filePath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    selectModelFile: () => Promise<string>;
    getAvailableModels: () => Promise<any[]>;
    getAppVersion: () => string;
    getPlatform: () => string;
    onModelProgress: (callback: (progress: string) => void) => void;
    onModelReady: (callback: (ready: boolean) => void) => void;
    onOllamaError: (callback: (error: string) => void) => void;
    removeAllListeners: (channel: string) => void;
  };
  electron?: {
    sendMessage: (message: string) => Promise<string>;
    onOllamaOutput: (callback: (output: string) => void) => void;
    onOllamaError: (callback: (error: string) => void) => void;
    onModelReady: (callback: () => void) => void;
  };
} 