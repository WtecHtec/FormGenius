import { MyStateCreator } from './store';

export type ModelProvider = 'openai' | 'ollama' | 'spark' | 'gemini';

export interface ModelConfig {
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
}

export type SettingsSlice = {
  openAIKey: string | null;
  modelProvider: ModelProvider;
  selectedModel: string;
  systemPrompt: string;
  modelConfigs: {
    openai: ModelConfig;
    ollama: ModelConfig;
    spark: ModelConfig;
    gemini: ModelConfig;
  };
  actions: {
    update: (values: Partial<SettingsSlice>) => void;
    updateModelConfig: (provider: ModelProvider, config: Partial<ModelConfig>) => void;
    addModel: (provider: ModelProvider, modelName: string) => void;
    removeModel: (provider: ModelProvider, modelName: string) => void;
    loadFromStorage: () => void;
    saveToStorage: () => void;
  };
};

const defaultSystemPrompt = `You are a browser automation assistant.

You can use the following tools:

{{ActionsTools}}

You will be be given a task to perform and the current state of the DOM. You will also be given previous actions that you have taken. You may retry a failed action up to one time.

This is an example of an action:

<Thought>I should click the add to cart button</Thought>
<Action>
click(223)
finish()
</Action>

You must always include the <Thought> and <Action> open/close tags or else your response will be marked as invalid.`;

// 存储键名
const STORAGE_KEY = 'taxy_ai_settings';

export const createSettingsSlice: MyStateCreator<SettingsSlice> = (set, get) => ({
  openAIKey: null,
  modelProvider: 'spark',
  selectedModel: 'generalv3',
  systemPrompt: defaultSystemPrompt,
  modelConfigs: {
    openai: {
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
    },
    ollama: {
      baseUrl: 'http://localhost:11434/api/chat',
      models: ['deepseek-r1:8b', 'gemma3:4b']
    },
    spark: {
      apiKey: '',
      baseUrl: 'https://spark-api-open.xf-yun.com/v1/chat/completions',
      models: [
        'max-32k',     // Max-32K版本
        'generalv3',   // Pro版本
        'pro-128k',    // Pro-128K版本
        'lite',        // Lite版本
        '4.0Ultra',    // 4.0 Ultra版本
        'x1'           // Spark X1深度推理模型
      ]
    },
    gemini: {
      apiKey: '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-lite', 'gemini-2.0-flash']
    }
  },
  actions: {
    update: (values) => {
      set((state) => {
        state.settings = { ...state.settings, ...values };
      });
      // 自动保存到本地存储
      setTimeout(() => get().settings.actions.saveToStorage(), 0);
    },
    updateModelConfig: (provider, config) => {
      set((state) => {
        state.settings.modelConfigs[provider] = {
          ...state.settings.modelConfigs[provider],
          ...config
        };
      });
      // 自动保存到本地存储
      setTimeout(() => get().settings.actions.saveToStorage(), 0);
    },
    // 添加新模型
    addModel: (provider, modelName) => {
      set((state) => {
        // 确保模型名称不为空且不重复
        if (modelName && !state.settings.modelConfigs[provider].models?.includes(modelName)) {
          state.settings.modelConfigs[provider].models = [
            ...(state.settings.modelConfigs[provider].models || []),
            modelName
          ];
        }
      });
      // 自动保存到本地存储
      setTimeout(() => get().settings.actions.saveToStorage(), 0);
    },
    // 移除模型
    removeModel: (provider, modelName) => {
      set((state) => {
        if (state.settings.modelConfigs[provider].models) {
          state.settings.modelConfigs[provider].models = 
            state.settings.modelConfigs[provider].models?.filter(model => model !== modelName);
          
          // 如果当前选中的模型被删除，则切换到第一个可用模型
          if (state.settings.modelProvider === provider && state.settings.selectedModel === modelName) {
            const availableModels = state.settings.modelConfigs[provider].models;
            if (availableModels && availableModels.length > 0) {
              state.settings.selectedModel = availableModels[0];
            }
          }
        }
      });
      // 自动保存到本地存储
      setTimeout(() => get().settings.actions.saveToStorage(), 0);
    },
    // 从本地存储加载设置
    loadFromStorage: () => {
      try {
        const storedSettings = localStorage.getItem(STORAGE_KEY);
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          
          // 更新设置，但保留默认的系统提示词（如果存储中没有）
          set((state) => {
            // 只更新存在的字段
            if (parsedSettings.openAIKey !== undefined) 
              state.settings.openAIKey = parsedSettings.openAIKey;
            
            if (parsedSettings.modelProvider) 
              state.settings.modelProvider = parsedSettings.modelProvider;
            
            if (parsedSettings.selectedModel) 
              state.settings.selectedModel = parsedSettings.selectedModel;
            
            if (parsedSettings.systemPrompt) 
              state.settings.systemPrompt = parsedSettings.systemPrompt;
            
            if (parsedSettings.modelConfigs) {
              // 合并模型配置，保留默认值
              Object.keys(parsedSettings.modelConfigs).forEach(key => {
                const provider = key as ModelProvider;
                if (state.settings.modelConfigs[provider]) {
                  state.settings.modelConfigs[provider] = {
                    ...state.settings.modelConfigs[provider],
                    ...parsedSettings.modelConfigs[provider]
                  };
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('从本地存储加载设置时出错:', error);
      }
    },
    // 保存设置到本地存储
    saveToStorage: () => {
      // try {
      //   const settings = get().settings;
      //   const settingsToSave = {
      //     openAIKey: settings.openAIKey,
      //     modelProvider: settings.modelProvider,
      //     selectedModel: settings.selectedModel,
      //     systemPrompt: settings.systemPrompt,
      //     modelConfigs: settings.modelConfigs
      //   };
      //   localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
      // } catch (error) {
      //   console.error('保存设置到本地存储时出错:', error);
      // }
    }
  },
});