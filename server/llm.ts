import fetch from 'node-fetch';
import { storage } from './storage';
import { Message } from "@shared/schema";

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
// デフォルトモデルはストレージから動的に取得
let currentModelName = process.env.OLLAMA_MODEL || 'llama3';

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

export async function initializeLLM(_modelPath: string) {
  try {
    // ストレージからデフォルトモデルを取得
    currentModelName = await storage.getDefaultModel();
    console.log(`デフォルトモデルを読み込みました: ${currentModelName}`);
    
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to connect to Ollama API: ${response.statusText}`);
    }
    console.log('Successfully connected to Ollama API');
  } catch (error) {
    console.warn('Failed to connect to Ollama API:', error);
    console.log('Please ensure Ollama is running and accessible');
  }
}

export async function generateResponse(messages: Message[], model: string = "deepscaler"): Promise<string> {
  try {
    console.log(`LLMリクエスト: ${messages.length}件のメッセージ履歴を含む`);
    console.log(`使用モデル: ${model}`);

    // Ollamaが利用可能かチェック
    try {
      await fetch("http://localhost:11434/api/tags");
    } catch (error) {
      console.error("Ollama APIに接続できません:", error);
      return "申し訳ありませんが、LLMサービスに接続できません。後でもう一度お試しください。";
    }

    // システムプロンプトを設定
    const systemPrompt = systemPromptContent || "あなたは医療現場のパソコン業務を支援する日本語AIアシスタントです。常に日本語で回答してください。信頼性の低いものやわからないものは'よくわかりません'と回答してください。";

    // メッセージ履歴をOllamaのフォーマットに変換
    const ollamaMessages = messages.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));

    // システムプロンプトを追加
    ollamaMessages.unshift({
      role: "system" as any,
      content: systemPrompt
    });

    // Ollamaにリクエスト
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: ollamaMessages,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama API error: ${response.status} ${errorText}`);
      return "申し訳ありませんが、LLMサービスでエラーが発生しました。後でもう一度お試しください。";
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error("Error generating response:", error);
    return "申し訳ありませんが、エラーが発生しました。後でもう一度お試しください。";
  }
}