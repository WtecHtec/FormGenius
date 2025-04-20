import {
  Configuration,
  CreateCompletionResponseUsage,
  OpenAIApi,
} from 'openai';
import { useAppState } from '../state/store';
import { ParsedResponseSuccess } from './parseResponse';
import { generateOllamaCompletion } from './apis/ollamaApi';
import systemPrompt from './systemPrompts';
import { convertSparkResponseToOpenAIFormat, generateSparkCompletion } from './apis/sparkApi';
import { generateGeminiCompletion } from './apis/geminiApi';
// 这里需要添加Gemini API的导入

export async function determineNextAction(
  taskInstructions: string,
  previousActions: ParsedResponseSuccess[],
  simplifiedDOM: string,
  maxAttempts = 1,
  notifyError?: (error: string) => void
) {
  const appState = useAppState.getState();
  const { modelProvider, selectedModel, modelConfigs, systemPrompt: customPrompt } = appState.settings;
  const prompt = formatPrompt(taskInstructions, previousActions, simplifiedDOM);
  
  // 处理系统提示词，替换占位符
  const processedSystemPrompt = systemPrompt(customPrompt);
  
  switch (modelProvider) {
    case 'openai':
      const openaiConfig = modelConfigs.openai;
      if (!openaiConfig.apiKey) {
        notifyError?.('未找到OpenAI API密钥');
        return null;
      }
      return callOpenAI(
        selectedModel, 
        prompt, 
        processedSystemPrompt,
        openaiConfig.apiKey, 
        openaiConfig.baseUrl || 'https://api.openai.com/v1',
        maxAttempts, 
        notifyError
      );
      
    case 'ollama':
      const ollamaConfig = modelConfigs.ollama;
      return callOllama(
        selectedModel, 
        prompt, 
        processedSystemPrompt,
        ollamaConfig.baseUrl || 'http://localhost:11434/api/', 
        maxAttempts, 
        notifyError
      );
      
    case 'spark':
      const sparkConfig = modelConfigs.spark;
      if (!sparkConfig.apiKey) {
        notifyError?.('未找到讯飞星火API密钥');
        return null;
      }
      return callSpark(
        selectedModel, 
        prompt, 
        processedSystemPrompt,
        sparkConfig.baseUrl || 'https://spark-api-open.xf-yun.com/v1/chat/completions', 
        sparkConfig.apiKey, 
        maxAttempts, 
        notifyError
      );
      
    case 'gemini':
      const geminiConfig = modelConfigs.gemini;
      if (!geminiConfig.apiKey) {
        notifyError?.('未找到Google Gemini API密钥');
        return null;
      }
      // 实现 Gemini API 调用
      return callGemini(
        selectedModel, 
        prompt, 
        processedSystemPrompt,
        geminiConfig.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models', 
        geminiConfig.apiKey, 
        maxAttempts, 
        notifyError
      );
      
    default:
      notifyError?.('不支持的模型提供商');
      return null;
  }
}

async function callOpenAI(
  model: string,
  prompt: string,
  systemMessage: string,
  apiKey: string,
  baseUrl: string,
  maxAttempts: number,
  notifyError?: (error: string) => void
) {
  const openai = new OpenAIApi(
    new Configuration({
      apiKey: apiKey,
      basePath: baseUrl
    })
  );

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const completion = await openai.createChatCompletion({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0,
        stop: ['</Action>'],
      });

      return {
        usage: completion.data.usage as CreateCompletionResponseUsage,
        prompt,
        response:
          completion.data.choices[0].message?.content?.trim() + '</Action>',
      };
    } catch (error: any) {
      console.log('OpenAI API error', error);
      if (error.response?.data?.error?.message?.includes('server error')) {
        // Problem with the OpenAI API, try again
        if (notifyError) {
          notifyError(error.response.data.error.message);
        }
      } else {
        // Another error, give up
        throw new Error(error.response?.data?.error?.message || error.message);
      }
    }
  }
  throw new Error(
    `在${maxAttempts}次尝试后无法完成查询。请稍后再试。`
  );
}

async function callOllama(
  model: string,
  prompt: string,
  systemMessage: string,
  baseUrl: string,
  maxAttempts: number,
  notifyError?: (error: string) => void
) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await generateOllamaCompletion({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
        options: {
          temperature: 0,
          stop: ['</Action>'],
        }
      }, baseUrl);

      // 创建一个模拟的OpenAI使用统计
      const mockUsage: CreateCompletionResponseUsage = {
        prompt_tokens: prompt.length / 4, // 粗略估计
        completion_tokens: response.response.length / 4, // 粗略估计
        total_tokens: (prompt.length + response.response.length) / 4, // 粗略估计
      };

      return {
        usage: mockUsage,
        prompt,
        response: response.response.trim() + '</Action>',
      };
    } catch (error: any) {
      console.log('Ollama API error', error);
      if (notifyError) {
        notifyError(error.message || '调用Ollama API时出错');
      }
      
      // 如果是连接错误，可能是Ollama服务未运行
      if (error.code === 'ECONNREFUSED' || error.message.includes('connect')) {
        notifyError?.('无法连接到Ollama服务。请确保Ollama正在运行。');
        break;
      }
    }
  }
  throw new Error(
    `在${maxAttempts}次尝试后无法完成Ollama查询。请确保Ollama服务正在运行。`
  );
}

async function callSpark(
  model: string,
  prompt: string,
  systemMessage: string,
  baseUrl: string,
  apiKey: string,
  maxAttempts: number,
  notifyError?: (error: string) => void
) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`尝试调用讯飞星火API，模型: ${model}`);
      
      const response = await generateSparkCompletion({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0,
        stop: [''],
      }, apiKey, baseUrl);

      const result = convertSparkResponseToOpenAIFormat(response, prompt);
      
      // 确保响应以</Action>结尾
      if (!result.response.trim().endsWith('</Action>')) {
        result.response = result.response.trim() + '</Action>';
      }

      return result;
    } catch (error: any) {
      console.log('讯飞星火API错误', error);
      
      const errorMessage = error.response 
        ? `讯飞星火API错误: ${error.response.status} ${error.response.statusText}` 
        : error.message || '调用讯飞星火API时出错';
      
      if (notifyError) {
        notifyError(errorMessage);
      }
      
      // 处理特定错误
      if (error.response && error.response.status === 401) {
        notifyError?.('讯飞星火API认证失败，请检查API密钥。');
        break;
      }
    }
  }
  throw new Error(
    `在${maxAttempts}次尝试后无法完成讯飞星火查询。请检查API密钥和网络连接。`
  );
}

async function callGemini(
  model: string,
  prompt: string,
  systemMessage: string,
  baseUrl: string,
  apiKey: string,
  maxAttempts: number,
  notifyError?: (error: string) => void
) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`尝试调用 Google Gemini API，模型: ${model}`);
      
      const response = await generateGeminiCompletion({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0,
        stop: ['</Action>'],
      }, apiKey, baseUrl);

      // 确保响应以</Action>结尾
      let responseText = response.choices[0].message.content;
      if (!responseText.trim().endsWith('</Action>')) {
        responseText = responseText.trim() + '</Action>';
      }

      return {
        usage: response.usage as CreateCompletionResponseUsage,
        prompt,
        response: responseText,
      };
    } catch (error: any) {
      console.log('Google Gemini API 错误', error);
      
      const errorMessage = error.response 
        ? `Google Gemini API 错误: ${error.response.status} ${error.response.statusText}` 
        : error.message || '调用 Google Gemini API 时出错';
      
      if (notifyError) {
        notifyError(errorMessage);
      }
      
      // 处理特定错误
      if (error.response && error.response.status === 401) {
        notifyError?.('Google Gemini API 认证失败，请检查 API 密钥。');
        break;
      }
    }
  }
  throw new Error(
    `在${maxAttempts}次尝试后无法完成 Google Gemini 查询。请检查 API 密钥和网络连接。`
  );
}

export function formatPrompt(
  taskInstructions: string,
  previousActions: ParsedResponseSuccess[],
  pageContents: string
) {
  let previousActionsString = '';

  if (previousActions.length > 0) {
    const serializedActions = previousActions
      .map(
        (action) =>
          `<Thought>${action.thought}</Thought>\n<Action>${action.action}</Action>`
      )
      .join('\n\n');
    previousActionsString = `You have already taken the following actions: \n${serializedActions}\n\n`;
  }

  return `The user requests the following task:

${taskInstructions}

${previousActionsString}

Current time: ${new Date().toLocaleString()}

Current page contents:
${pageContents}`;
}