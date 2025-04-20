import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Flex,
  Spacer,
  useToast,
  IconButton,
  HStack,
  Divider,
  Badge,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { DeleteIcon, RepeatIcon, TimeIcon, AddIcon } from '@chakra-ui/icons';
import { useAppState } from '../state/store';
// import { formatDistanceToNow } from 'date-fns';
// import { zhCN } from 'date-fns/locale';

export const ActionHistoryPanel: React.FC = () => {
  const toast = useToast();
  const { savedActions, deleteAction, executeAction, saveAction } = useAppState((state) => ({
    savedActions: state.actionHistory.savedActions,
    deleteAction: state.actionHistory.actions.deleteAction,
    executeAction: state.actionHistory.actions.executeAction,
    saveAction: state.actionHistory.actions.saveAction,
  }));
  
  const { instructions, status } = useAppState((state) => ({
    instructions: state.currentTask.instructions,
    status: state.currentTask.status,
  }));
  
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [actionName, setActionName] = useState('');
  
  // 加载历史记录
  useEffect(() => {
    useAppState.getState().actionHistory.actions.loadFromStorage();
  }, []);

  const handleExecute = async (id: string) => {
    setIsExecuting(id);
    try {
      await executeAction(id);
      toast({
        title: '操作执行成功',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: '操作执行失败',
        description: error instanceof Error ? error.message : String(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExecuting(null);
    }
  };

  const handleDelete = (id: string) => {
    deleteAction(id);
    toast({
      title: '操作已删除',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };
  
  const handleSaveCurrentTask = () => {
    if (!instructions) {
      toast({
        title: '无法保存',
        description: '当前没有可保存的指令',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsSaveModalOpen(true);
  };
  
  const handleSaveConfirm = () => {
    if (!actionName.trim()) {
      toast({
        title: '请输入名称',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    
    if (instructions) {
      saveAction(actionName, instructions);
      toast({
        title: '保存成功',
        description: '操作已保存到历史记录',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setIsSaveModalOpen(false);
      setActionName('');
    }
  };

  return (
    <>
      <VStack spacing={4} align="stretch" width="100%" mt={4}>
        <Flex align="center">
          <Heading size="md">操作历史</Heading>
          <Spacer />
          <Button 
            leftIcon={<AddIcon />} 
            colorScheme="blue" 
            size="sm"
            onClick={handleSaveCurrentTask}
            isDisabled={!instructions || status === 'running'}
          >
            保存当前操作
          </Button>
        </Flex>
        <Divider />
        
        {savedActions.length === 0 ? (
          <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
            <Text textAlign="center" color="gray.500">
              暂无保存的操作历史
            </Text>
          </Box>
        ) : (
          savedActions
            .sort((a, b) => b.createdAt - a.createdAt) // 按创建时间降序排列
            .map((action) => (
              <Box 
                key={action.id} 
                p={4} 
                borderWidth="1px" 
                borderRadius="md" 
                bg="white"
                _hover={{ boxShadow: 'md' }}
                transition="all 0.2s"
              >
                <Flex direction="column">
                  <Flex align="center" mb={2}>
                    <Heading size="sm" isTruncated maxWidth="70%">
                      {action.name}
                    </Heading>
                    <Spacer />
                    <Tooltip label="创建时间">
                      <HStack spacing={1}>
                        <TimeIcon color="gray.500" />
                        <Text fontSize="xs" color="gray.500">
                          {/* {formatDistanceToNow(new Date(action.createdAt), { 
                            addSuffix: true,
                            locale: zhCN 
                          })} */}
                        </Text>
                      </HStack>
                    </Tooltip>
                  </Flex>
                  
                  <Text fontSize="sm" color="gray.600" noOfLines={2} mb={3}>
                    {action.instructions}
                  </Text>
                  
                  <Flex>
                    <Button
                      leftIcon={<RepeatIcon />}
                      colorScheme="teal"
                      size="sm"
                      onClick={() => handleExecute(action.id)}
                      isLoading={isExecuting === action.id}
                      loadingText="执行中"
                      isDisabled={status === 'running'}
                    >
                      执行
                    </Button>
                    <Spacer />
                    <IconButton
                      icon={<DeleteIcon />}
                      colorScheme="red"
                      variant="ghost"
                      size="sm"
                      aria-label="删除操作"
                      onClick={() => handleDelete(action.id)}
                    />
                  </Flex>
                </Flex>
              </Box>
            ))
        )}
      </VStack>
      
      {/* 保存操作的模态框 */}
      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>保存操作</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>操作名称</FormLabel>
              <Input 
                value={actionName}
                onChange={(e) => setActionName(e.target.value)}
                placeholder="输入一个便于识别的名称"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsSaveModalOpen(false)}>
              取消
            </Button>
            <Button colorScheme="blue" onClick={handleSaveConfirm}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ActionHistoryPanel;