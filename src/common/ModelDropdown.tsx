import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useDisclosure,
  Box
} from '@chakra-ui/react';
import { ChevronDownIcon, SettingsIcon } from '@chakra-ui/icons';
import { useAppState } from '../state/store';
import SettingsPage from './SettingsPage';

const ModelDropdown: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { modelProvider, selectedModel, modelConfigs } = useAppState(
    (state) => state.settings
  );

  const handleModelSelect = (provider: string, model: string) => {
    useAppState.getState().settings.actions.update({
      modelProvider: provider as any,
      selectedModel: model
    });
  };

  return (
    <>
      <Menu>
        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} size="sm">
          {selectedModel}
        </MenuButton>
        <MenuList maxH="240px" overflowY="auto">
          <MenuItem isDisabled fontWeight="bold">OpenAI</MenuItem>
          {modelConfigs.openai.models?.map(model => (
            <MenuItem 
              key={model} 
              onClick={() => handleModelSelect('openai', model)}
              bg={modelProvider === 'openai' && selectedModel === model ? 'blue.100' : undefined}
            >
              {model}
            </MenuItem>
          ))}
          
          <MenuDivider />
          
          <MenuItem isDisabled fontWeight="bold">Ollama (本地)</MenuItem>
          {modelConfigs.ollama.models?.map(model => (
            <MenuItem 
              key={model} 
              onClick={() => handleModelSelect('ollama', model)}
              bg={modelProvider === 'ollama' && selectedModel === model ? 'blue.100' : undefined}
            >
              {model}
            </MenuItem>
          ))}
          
          <MenuDivider />
          
          <MenuItem isDisabled fontWeight="bold">讯飞星火</MenuItem>
          {modelConfigs.spark.models?.map(model => (
            <MenuItem 
              key={model} 
              onClick={() => handleModelSelect('spark', model)}
              bg={modelProvider === 'spark' && selectedModel === model ? 'blue.100' : undefined}
            >
              {model}
            </MenuItem>
          ))}
          
          <MenuDivider />
          
          <MenuItem isDisabled fontWeight="bold">Google Gemini</MenuItem>
          {modelConfigs.gemini.models?.map(model => (
            <MenuItem 
              key={model} 
              onClick={() => handleModelSelect('gemini', model)}
              bg={modelProvider === 'gemini' && selectedModel === model ? 'blue.100' : undefined}
            >
              {model}
            </MenuItem>
          ))}
          
          <MenuDivider />
          
          <MenuItem onClick={onOpen} icon={<SettingsIcon />}>
            设置
          </MenuItem>
        </MenuList>
      </Menu>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalBody p={6}>
            <SettingsPage onBack={onClose} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ModelDropdown;