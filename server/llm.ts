import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp";

let model: LlamaModel | null = null;
let context: LlamaContext | null = null;
let session: LlamaChatSession | null = null;

export async function initializeLLM(modelPath: string) {
  // Temporary stub until Ollama integration
  console.log("LLM initialization skipped - waiting for Ollama integration");
  return;
}

export async function generateResponse(userMessage: string): Promise<string> {
  // Temporary response until Ollama integration
  return `[Temporary response] You said: ${userMessage}`;
}