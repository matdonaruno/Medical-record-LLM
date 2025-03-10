import fetch from 'node-fetch';
import { storage } from './storage';
import { Message } from "@shared/schema";

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
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
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama API connection failed: ${response.statusText}`);
    }
    return true;
  } catch (error) {
    console.error('Ollama connection error:', error);
    return false;
  }
}

export async function initializeLLM(_modelPath: string) {
  try {
    // Ollamaの接続確認
    const isConnected = await checkOllamaConnection();
    if (!isConnected) {
      throw new Error('Ollamaに接続できません。Ollamaが起動しているか確認してください。');
    }

    // ストレージからデフォルトモデルを取得
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
    
  } catch (error) {
    console.error('LLM初期化エラー:', error);
    throw new Error('LLMの初期化に失敗しました。Ollamaが正しく起動しているか確認してください。');
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
      role: 'system' as any, // Ollamaのシステムメッセージ用
      content: systemPrompt
    });

    const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
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