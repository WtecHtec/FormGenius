import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Textarea,
  VStack,
  Text,
  useToast,
  HStack,
  IconButton,
  Tooltip,
  Divider
} from '@chakra-ui/react';
import { useAppState } from '../state/store';
import { ModelProvider } from '../state/settings';
import { ArrowBackIcon, InfoIcon, DeleteIcon, AddIcon } from '@chakra-ui/icons';

// 模型配置面板组件
const ModelConfigPanel: React.FC<{ provider: ModelProvider }> = ({ provider }) => {
  const toast = useToast();
  const { settings, updateSettings, updateModelConfig, addModel, removeModel } = useAppState((state) => ({
    settings: state.settings,
    updateSettings: state.settings.actions.update,
    updateModelConfig: state.settings.actions.updateModelConfig,
    addModel: state.settings.actions.addModel,
    removeModel: state.settings.actions.removeModel
  }));
  
  const [newModelName, setNewModelName] = useState('');
  const config = settings.modelConfigs[provider];
  
  // 获取提供商显示名称
  const getProviderDisplayName = (provider: ModelProvider) => {
    switch(provider) {
      case 'openai': return 'OpenAI';
      case 'ollama': return 'Ollama (本地)';
      case 'spark': return '讯飞星火';
      case 'gemini': return 'Google Gemini';
      default: return provider;
    }
  };
  
  // 添加新模型
  const handleAddModel = () => {
    if (!newModelName.trim()) {
      toast({
        title: '模型名称不能为空',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (config.models?.includes(newModelName)) {
      toast({
        title: '模型已存在',
        description: `${newModelName} 已在列表中`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    addModel(provider, newModelName);
    setNewModelName('');
    toast({
      title: '添加成功',
      description: `已添加模型 ${newModelName}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  return (
    <VStack spacing={4} align="stretch">
      {provider !== 'ollama' && (
        <FormControl>
          <FormLabel>API 密钥</FormLabel>
          <Input 
            type="password" 
            value={config.apiKey || ''} 
            onChange={(e) => updateModelConfig(provider, { apiKey: e.target.value })}
            placeholder={`输入${getProviderDisplayName(provider)} API 密钥`}
          />
        </FormControl>
      )}
      
      <FormControl>
        <FormLabel>API 基础 URL</FormLabel>
        <Input 
          value={config.baseUrl || ''} 
          onChange={(e) => updateModelConfig(provider, { baseUrl: e.target.value })}
          placeholder="输入API基础URL"
        />
      </FormControl>
      
      <Divider my={2} />
      
      <Text fontWeight="medium">可用模型</Text>
      
      <Box maxH="200px" overflowY="auto" border="1px solid" borderColor="gray.200" borderRadius="md" p={2}>
        {config.models?.map(model => (
          <HStack key={model} p={1} justify="space-between">
            <Text>{model}</Text>
            <IconButton
              aria-label="删除模型"
              icon={<DeleteIcon />}
              size="sm"
              variant="ghost"
              colorScheme="red"
              onClick={() => removeModel(provider, model)}
            />
          </HStack>
        ))}
        {(!config.models || config.models.length === 0) && (
          <Text color="gray.500" p={2}>暂无模型，请添加</Text>
        )}
      </Box>
      
      <HStack>
        <Input
          placeholder="输入新模型名称"
          value={newModelName}
          onChange={(e) => setNewModelName(e.target.value)}
        />
        <IconButton
          aria-label="添加模型"
          icon={<AddIcon />}
          colorScheme="blue"
          onClick={handleAddModel}
        />
      </HStack>
      
      <FormControl>
        <FormLabel>当前选择</FormLabel>
        <Select 
          value={settings.modelProvider === provider ? settings.selectedModel : ''}
          onChange={(e) => {
            if (settings.modelProvider === provider) {
              updateSettings({ selectedModel: e.target.value });
            }
          }}
          isDisabled={settings.modelProvider !== provider}
        >
          {config.models?.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </Select>
      </FormControl>
    </VStack>
  );
};

// 主设置页面组件
const SettingsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const toast = useToast();
  const { settings, updateSettings } = useAppState((state) => ({
    settings: state.settings,
    updateSettings: state.settings.actions.update
  }));

  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);

  // 保存系统提示词
  const handleSaveSystemPrompt = () => {
    if (!systemPrompt.includes('{{ActionsTools}}')) {
      toast({
        title: '缺少必要的占位符',
        description: '系统提示词必须包含 {{ActionsTools}} 占位符',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    updateSettings({ systemPrompt });
    toast({
      title: '保存成功',
      description: '系统提示词已更新',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // 切换模型提供商
  const handleModelProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as ModelProvider;
    updateSettings({ 
      modelProvider: provider,
      selectedModel: settings.modelConfigs[provider].models?.[0] || ''
    });
  };

  // 切换模型
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ selectedModel: e.target.value });
  };

  return (
    <Box>
      <HStack mb={4}>
        <IconButton
          aria-label="返回"
          icon={<ArrowBackIcon />}
          onClick={onBack}
        />
        <Text fontSize="xl" fontWeight="bold">设置</Text>
      </HStack>

      <Tabs variant="enclosed">
        <TabList>
          <Tab>模型选择</Tab>
          <Tab>系统提示词</Tab>
          <Tab>模型配置</Tab>
        </TabList>

        <TabPanels>
          {/* 模型选择面板 */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>模型提供商</FormLabel>
                <Select value={settings.modelProvider} onChange={handleModelProviderChange}>
                  <option value="openai">OpenAI</option>
                  <option value="ollama">Ollama (本地)</option>
                  <option value="spark">讯飞星火</option>
                  <option value="gemini">Google Gemini</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>选择模型</FormLabel>
                <Select value={settings.selectedModel} onChange={handleModelChange}>
                  {settings.modelConfigs[settings.modelProvider].models?.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </TabPanel>

          {/* 系统提示词面板 */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>
                  系统提示词
                  <Tooltip label="必须包含 {{ActionsTools}} 占位符，用于插入可用工具列表">
                    <InfoIcon ml={2} />
                  </Tooltip>
                </FormLabel>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="输入系统提示词，必须包含 {{ActionsTools}} 占位符"
                  minHeight="300px"
                />
              </FormControl>
              <Button colorScheme="blue" onClick={handleSaveSystemPrompt}>
                保存系统提示词
              </Button>
            </VStack>
          </TabPanel>

          {/* 模型配置面板 */}
          <TabPanel>
            <Tabs variant="soft-rounded">
              <TabList>
                <Tab>OpenAI</Tab>
                <Tab>Ollama</Tab>
                <Tab>讯飞星火</Tab>
                <Tab>Google Gemini</Tab>
              </TabList>
              <TabPanels>
                <TabPanel><ModelConfigPanel provider="openai" /></TabPanel>
                <TabPanel><ModelConfigPanel provider="ollama" /></TabPanel>
                <TabPanel><ModelConfigPanel provider="spark" /></TabPanel>
                <TabPanel><ModelConfigPanel provider="gemini" /></TabPanel>
              </TabPanels>
            </Tabs>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default SettingsPage;