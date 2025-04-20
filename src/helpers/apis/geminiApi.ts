import axios from 'axios';
import { CreateCompletionResponseUsage } from 'openai';

export interface GeminiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeminiCompletionRequest {
  model: string;
  messages: GeminiMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
}

export interface GeminiCompletionResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function generateGeminiCompletion(
  request: GeminiCompletionRequest,
  apiKey: string,
  baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models'
): Promise<GeminiCompletionResponse> {
  try {
    console.log('调用 Google Gemini API', request);
    
    // 转换请求格式为 Gemini API 格式
    const geminiRequest = {
      contents: request.messages.map(msg => {
        // Gemini API 不支持 system 角色，将 system 消息转换为 user 消息
        const role = msg.role === 'system' ? 'user' : msg.role;
        return {
          role: role,
          parts: [{ text: msg.content }]
        };
      }),
      generationConfig: {
        temperature: request.temperature || 0,
        maxOutputTokens: request.max_tokens || 1024,
        stopSequences: request.stop || []
      }
    };
    
    // 构建完整的 URL，包含模型名称和 API 密钥
    const url = `${baseUrl}/${request.model}:generateContent?key=${apiKey}`;
    
    const response = await axios.post(
      url,
      geminiRequest,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    console.log('Google Gemini API 响应成功');
    
    // 转换 Gemini 响应为标准格式
    const result = convertGeminiResponseToOpenAIFormat(response.data, request);
    return result;
  } catch (error: any) {
    console.error('调用 Google Gemini API 失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    throw error;
  }
}

// 将 Gemini API 的响应转换为与 OpenAI 兼容的格式
export function convertGeminiResponseToOpenAIFormat(
  geminiResponse: any,
  request: GeminiCompletionRequest
): GeminiCompletionResponse {
  // 提取响应文本
  const content = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // 估算 token 数量（粗略估计）
  const promptTokens = request.messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0);
  const completionTokens = Math.ceil(content.length / 4);
  
  return {
    id: `gemini-${Date.now()}`,
    model: request.model,
    created: Date.now(),
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: content
        },
        finish_reason: geminiResponse.candidates?.[0]?.finishReason || 'stop'
      }
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    }
  };
}