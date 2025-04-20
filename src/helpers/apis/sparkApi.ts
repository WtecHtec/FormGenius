import axios from 'axios';
import { CreateCompletionResponseUsage } from 'openai';

export interface SparkMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SparkCompletionRequest {
  model: string;
  messages: SparkMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
}

export interface SparkCompletionResponse {
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

export async function generateSparkCompletion(
  request: SparkCompletionRequest,
  apiKey: string,
  baseUrl: string = 'https://spark-api-open.xf-yun.com/v1/chat/completions'
): Promise<SparkCompletionResponse> {
  try {
    console.log('调用讯飞星火API', request);
    
    const response = await axios.post<SparkCompletionResponse>(
      baseUrl,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 60000
      }
    );
    
    console.log('讯飞星火API响应成功');
    return response.data;
  } catch (error: any) {
    console.error('调用讯飞星火API失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    throw error;
  }
}

// 将讯飞星火API的响应转换为与OpenAI兼容的格式
export function convertSparkResponseToOpenAIFormat(
  sparkResponse: SparkCompletionResponse,
  prompt: string
): {
  usage: CreateCompletionResponseUsage;
  prompt: string;
  response: string;
} {
  return {
    usage: {
      prompt_tokens: sparkResponse?.usage?.prompt_tokens || 0,
      completion_tokens: sparkResponse?.usage?.completion_tokens || 0,
      total_tokens: sparkResponse?.usage?.total_tokens || 0
    },
    prompt,
    response: sparkResponse?.choices[0]?.message?.content
  };
}