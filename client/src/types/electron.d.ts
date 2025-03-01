interface Window {
  electron?: {
    onOllamaOutput: (callback: (output: string) => void) => void;
    onOllamaError: (callback: (error: string) => void) => void;
    onModelReady: (callback: () => void) => void;
  };
} 