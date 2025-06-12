import fetch from 'node-fetch';
import { storage } from './storage';
import { Message } from "@shared/schema";
import { config } from './config';
// デフォルトモデルはストレージから動的に取得
let currentModelName = process.env.OLLAMA_MODEL || 'llama3:latest';

// システムプロンプトの内容
let systemPromptContent: string | null = null;

// システムプロンプトを設定する関数
export function setSystemPrompt(content: string): void {
  systemPromptContent = content;
  console.log(`システムプロンプトを設定しました: ${content}`);
}

// 現在のモデル名を取得
export function getCurrentModel(): string {
  return currentModelName;
}

// モデルを変更
export async function setCurrentModel(modelName: string) {
  currentModelName = modelName;
  await storage.setDefaultModel(modelName);
  console.log(`モデルを変更しました: ${modelName}`);
}

async function checkOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama API connection failed: ${response.statusText}`);
    }
    return true;
  } catch (error) {
    console.error('Ollama connection error:', error);
    return false;
  }
}

export async function initializeLLM(_modelPath: string, skipOllamaCheck: boolean = false) {
  try {
    // 開発環境やElectronモードではOllamaチェックをスキップ可能
    if (!skipOllamaCheck) {
      console.log('Ollamaの接続を確認中...');
      // Ollamaの接続確認（タイムアウト付き）
      let isConnected = false;
      let retryCount = 0;
      const maxRetries = 10;
      
      while (!isConnected && retryCount < maxRetries) {
        isConnected = await checkOllamaConnection();
        if (!isConnected) {
          console.log(`Ollama接続試行 ${retryCount + 1}/${maxRetries}...`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
        }
      }
      
      if (!isConnected) {
        console.warn('Ollamaに接続できませんが、初期化を続行します。Electronモードでは自動起動されます。');
      }
    } else {
      console.log('Ollamaチェックをスキップしました（Electronモード）');
    }

    // ストレージからデフォルトモデルを取得
    try {
      const storedModel = await storage.getDefaultModel();
      if (storedModel) {
        // llama_proが設定されている場合は、llama3:latestに変更
        if (storedModel === 'llama_pro') {
          await storage.setDefaultModel('llama3:latest');
          currentModelName = 'llama3:latest';
          console.log('デフォルトモデルをllama3:latestに変更しました');
        } else {
          currentModelName = storedModel;
        }
      }
      console.log(`デフォルトモデルを設定しました: ${currentModelName}`);
    } catch (storageError) {
      console.warn('ストレージからのモデル取得に失敗しましたが、デフォルト値を使用します:', storageError);
    }
    
  } catch (error) {
    console.error('LLM初期化エラー:', error);
    // Electronモードでは致命的エラーにしない
    if (skipOllamaCheck) {
      console.warn('LLM初期化で警告が発生しましたが、続行します');
    } else {
      throw new Error('LLMの初期化に失敗しました。Ollamaが正しく起動しているか確認してください。');
    }
  }
}

export async function generateResponse(messages: Message[], model: string = currentModelName): Promise<string> {
  try {
    console.log(`LLMリクエスト: ${messages.length}件のメッセージ履歴を含む`);
    console.log(`使用モデル: ${model}`);

    // Ollamaの接続確認
    const isConnected = await checkOllamaConnection();
    if (!isConnected) {
      return "申し訳ありませんが、LLMサービスに接続できません。Ollamaが起動しているか確認してください。";
    }

    const systemPrompt = systemPromptContent || "あなたは医療現場のパソコン業務を支援する日本語AIアシスタントです。常に日本語で回答してください。信頼性の低いものやわからないものは'よくわかりません'と回答してください。";

    // メッセージを適切な形式に変換
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // システムメッセージを追加
    formattedMessages.unshift({
      role: 'system' as const, // Ollamaのシステムメッセージ用
      content: systemPrompt
    });

    const response = await fetch(`${config.ollama.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: formattedMessages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama API error: ${response.status} ${errorText}`);
      throw new Error(`Ollama API error: ${errorText}`);
    }

    const data = await response.json();
    if (!data.message || !data.message.content) {
      console.error('Unexpected response format:', data);
      throw new Error('Unexpected response format from Ollama');
    }

    return data.message.content;
  } catch (error) {
    console.error("Error generating response:", error);
    return "申し訳ありませんが、エラーが発生しました。Ollamaの状態を確認してください。";
  }
}

// Ollamaから利用可能なモデル一覧を取得
export async function getAvailableModels() {
  try {
    const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Ollamaのレスポンス形式: { models: [{ name, model, modified_at, size, ... }] }
    interface OllamaModel {
      name: string;
      model?: string;
      modified_at?: string;
      size?: number;
    }

    return data.models.map((model: OllamaModel, index: number) => ({
      id: index + 1,
      model_name: model.name,
      display_name: getDisplayName(model.name),
      size: formatModelSize(model.size),
      modified_at: model.modified_at
    }));
  } catch (error) {
    console.error('Error fetching models from Ollama:', error);
    // Ollamaに接続できない場合はデフォルトのモデルリストを返す
    return getDefaultModels();
  }
}

// モデル名から表示名を生成
function getDisplayName(modelName: string): string {
  const nameMap: { [key: string]: string } = {
    'llama3:latest': 'Llama 3 8B',
    'llama3.2:latest': 'Llama 3.2 3B',
    'gemma3:latest': 'Gemma 3 8B',
    'gemma3:1b': 'Gemma 3 1B',
    'gemma3:12b': 'Gemma 3 12B',
    'gemma:2b': 'Gemma 2B',
    'gemma2:2b': 'Gemma 2 2B',
    'deepseek-coder:6.7b': 'DeepSeek Coder 6.7B',
    'deepseek-r1:7b': 'DeepSeek R1 7B',
    'deepscaler:latest': 'DeepScaler'
  };
  
  return nameMap[modelName] || modelName;
}

// ファイルサイズを人間が読みやすい形式にフォーマット
function formatModelSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// デフォルトのモデルリスト（Ollamaに接続できない場合のフォールバック）
function getDefaultModels() {
  return [
    { id: 1, model_name: "llama3:latest", display_name: "Llama 3 8B", size: "Unknown", modified_at: null },
    { id: 2, model_name: "gemma3:latest", display_name: "Gemma 3 8B", size: "Unknown", modified_at: null }
  ];
}