import { fetch } from 'node-fetch';

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.OLLAMA_MODEL || 'llama2';

interface OllamaResponse {
  response: string;
  done: boolean;
}

export async function initializeLLM(_modelPath: string) {
  try {
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

export async function generateResponse(userMessage: string): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: userMessage,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse;
    return data.response;
  } catch (error) {
    console.error('Error generating response:', error);
    return `Error: Could not generate response. Please ensure Ollama is running with the llama2 model.`;
  }
}