import { MyStateCreator } from './store';
import { sleep } from '../helpers/utils';

const STORAGE_KEY = 'taxy-action-history';

export interface SavedAction {
  id: string;
  name: string;
  instructions: string;
  createdAt: number;
}

export type ActionHistorySlice = {
  savedActions: SavedAction[];
  actions: {
    saveAction: (name: string, instructions: string) => void;
    deleteAction: (id: string) => void;
    executeAction: (id: string) => Promise<void>;
    loadFromStorage: () => void;
    saveToStorage: () => void;
  };
};

export const createActionHistorySlice: MyStateCreator<ActionHistorySlice> = (
  set,
  get
) => ({
  savedActions: [],
  actions: {
    saveAction: (name, instructions) => {
      set((state) => {
        const newAction: SavedAction = {
          id: Date.now().toString(),
          name,
          instructions,
          createdAt: Date.now(),
        };
        state.actionHistory.savedActions = [
          ...state.actionHistory.savedActions,
          newAction,
        ];
      });
      // 自动保存到本地存储
      setTimeout(() => get().actionHistory.actions.saveToStorage(), 0);
    },

    deleteAction: (id) => {
      set((state) => {
        state.actionHistory.savedActions = state.actionHistory.savedActions.filter(
          (action) => action.id !== id
        );
      });
      // 自动保存到本地存储
      setTimeout(() => get().actionHistory.actions.saveToStorage(), 0);
    },

    executeAction: async (id) => {
      try {
        const savedAction = get().actionHistory.savedActions.find(
          (action) => action.id === id
        );
        
        if (!savedAction) {
          throw new Error('未找到指定的操作');
        }
        
        // 设置指令
        get().ui.actions.setInstructions(savedAction.instructions);
        
        // 执行任务
        await get().currentTask.actions.runTask((error) => {
          console.error('执行操作时出错:', error);
          throw new Error(error);
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('执行历史操作失败:', errorMessage);
        throw new Error(errorMessage);
      }
    },

    loadFromStorage: () => {
      try {
        const storedActions = localStorage.getItem(STORAGE_KEY);
        if (storedActions) {
          const parsedActions = JSON.parse(storedActions);
          set((state) => {
            state.actionHistory.savedActions = parsedActions;
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('从本地存储加载历史操作时出错:', errorMessage);
      }
    },

    saveToStorage: () => {
      try {
        const actions = get().actionHistory.savedActions;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('保存历史操作到本地存储时出错:', errorMessage);
      }
    }
  },
});