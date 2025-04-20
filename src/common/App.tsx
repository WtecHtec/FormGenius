import { Box, ChakraProvider, Heading, HStack, Divider } from '@chakra-ui/react';
import React from 'react';
import { useAppState } from '../state/store';
import ModelDropdown from './ModelDropdown';
import SetAPIKey from './SetAPIKey';
import TaskUI from './TaskUI';
import ActionHistoryPanel from './ActionHistoryPanel';
import logo from '../assets/img/icon-128.png';

const App = () => {
  const openAIKey = useAppState((state) => state.settings.openAIKey);

  return (
    <ChakraProvider>
      <Box p="8" fontSize="lg" w="full">
        <HStack mb={4} alignItems="center">
          <img
            src={logo}
            width={32}
            height={32}
            className="App-logo"
            alt="logo"
          />

          <Heading as="h1" size="lg" flex={1}>
            Taxy AI
          </Heading>
          <Box>
            <ModelDropdown />
          </Box>
        </HStack>
        <TaskUI />
        <Divider my={4} />
        {/* <ActionHistoryPanel /> */}
      </Box>
    </ChakraProvider>
  );
};

export default App;
