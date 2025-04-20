import axios from 'axios';

export interface OllamaCompletionRequest {
  model: string;
  promp?: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  messages?: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaCompletionResponse {
  model: string;
  created_at: string;
  response: string;
  context: number[];
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModelsResponse {
  models: {
    name: string;
    modified_at: string;
    size: number;
  }[];
}

export async function getAvailableOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<string[]> {
  try {
    const response = await axios.get<OllamaModelsResponse>(`${baseUrl}/api/tags`);
    return response.data.models.map(model => model.name);
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    return [];
  }
}

export async function generateOllamaCompletion(
  request: OllamaCompletionRequest,
  baseUrl: string = 'http://localhost:11434/api/chat'
): Promise<OllamaCompletionResponse> {
  try {
    const response = await axios.post<OllamaCompletionResponse>(
      `${baseUrl}`,
      request
    );
    return response.data;
  } catch (error) {
    console.error('Error generating Ollama completion:', error);
    throw error;
  }
}