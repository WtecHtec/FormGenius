import { CreateCompletionResponseUsage } from 'openai';
import { attachDebugger, detachDebugger } from '../helpers/chromeDebugger';
import {
  disableIncompatibleExtensions,
  reenableExtensions,
} from '../helpers/disableExtensions';
import { callDOMAction } from '../helpers/domActions';
import {
  ParsedResponse,
  ParsedResponseSuccess,
  parseResponse,
} from '../helpers/parseResponse';
import { determineNextAction } from '../helpers/determineNextAction';
import templatize from '../helpers/shrinkHTML/templatize';
import { getSimplifiedDom } from '../helpers/simplifyDom';
import { sleep, truthyFilter } from '../helpers/utils';
import { MyStateCreator } from './store';

export type TaskHistoryEntry = {
  prompt: string;
  response: string;
  action: ParsedResponse;
  usage: CreateCompletionResponseUsage;
};

export type CurrentTaskSlice = {
  tabId: number;
  instructions: string | null;
  history: TaskHistoryEntry[];
  status: 'idle' | 'running' | 'success' | 'error' | 'interrupted';
  actionStatus:
    | 'idle'
    | 'attaching-debugger'
    | 'pulling-dom'
    | 'transforming-dom'
    | 'performing-query'
    | 'performing-action'
    | 'waiting';
  actions: {
    runTask: (onError: (error: string) => void) => Promise<void>;
    interrupt: () => void;
  };
};
export const createCurrentTaskSlice: MyStateCreator<CurrentTaskSlice> = (
  set,
  get
) => ({
  tabId: -1,
  instructions: null,
  history: [],
  status: 'idle',
  actionStatus: 'idle',
  actions: {
    runTask: async (onError) => {
      const wasStopped = () => get().currentTask.status !== 'running';
      const setActionStatus = (status: CurrentTaskSlice['actionStatus']) => {
        set((state) => {
          state.currentTask.actionStatus = status;
        });
      };

      const instructions = get().ui.instructions;

      if (!instructions || get().currentTask.status === 'running') return;

      set((state) => {
        state.currentTask.instructions = instructions;
        state.currentTask.history = [];
        state.currentTask.status = 'running';
        state.currentTask.actionStatus = 'attaching-debugger';
      });

      try {
        const activeTab = (
          await chrome.tabs.query({ active: true, currentWindow: true })
        )[0];

        if (!activeTab.id) throw new Error('No active tab found');
        const tabId = activeTab.id;
        set((state) => {
          state.currentTask.tabId = tabId;
        });

        await attachDebugger(tabId);
        await disableIncompatibleExtensions();

        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (wasStopped()) break;

          setActionStatus('pulling-dom');
          const pageDOM = await getSimplifiedDom();
          if (!pageDOM) {
            set((state) => {
              state.currentTask.status = 'error';
            });
            break;
          }
          const html = pageDOM.outerHTML;

          if (wasStopped()) break;
          setActionStatus('transforming-dom');
          const currentDom = templatize(html);

          const previousActions = get()
            .currentTask.history.map((entry) => entry.action)
            .filter(truthyFilter);

          setActionStatus('performing-query');

          const query = await determineNextAction(
            instructions,
            previousActions.filter(
              (pa) => !('error' in pa)
            ) as ParsedResponseSuccess[],
            currentDom,
            3,
            onError
          );

          if (!query) {
            set((state) => {
              state.currentTask.status = 'error';
            });
            break;
          }

          if (wasStopped()) break;

          setActionStatus('performing-action');
          const action = parseResponse(query.response);
          console.log('query', query.response);
          console.log('action', action);
          set((state) => {
            state.currentTask.history.push({
              prompt: query.prompt,
              response: query.response,
              action,
              usage: query.usage,
            });
          });
          if ('error' in action) {
            onError(action.error);
            break;
          }
          if (
            action === null ||
            action.parsedAction.name === 'finish' ||
            action.parsedAction.name === 'fail'
          ) {
            break;
          }

           // 处理多个actions
           if (action.parsedActions && action.parsedActions.length > 0) {
            // 按顺序执行所有actions
            for (const parsedAction of action.parsedActions) {
              if (wasStopped()) break;
              
              console.log('执行action:', parsedAction.name, parsedAction.args);
              
              if (parsedAction.name === 'finish' || parsedAction.name === 'fail') {
                break; // 如果遇到finish或fail，停止执行后续actions
              }
              
              // 执行DOM操作
              if (parsedAction.name === 'click' || parsedAction.name === 'setValue') {
                await callDOMAction(parsedAction.name, parsedAction.args);
                // 每个action之间添加短暂延迟，确保DOM有时间响应
                await sleep(500);
              }
            }
          } else {
            // 向后兼容，处理单个action
            if (action.parsedAction.name === 'click') {
              await callDOMAction('click', action.parsedAction.args);
            } else if (action.parsedAction.name === 'setValue') {
              await callDOMAction(
                action?.parsedAction.name,
                action?.parsedAction.args
              );
            }
          }


          if (wasStopped()) break;

          // While testing let's automatically stop after 50 actions to avoid
          // infinite loops
          if (get().currentTask.history.length >= 50) {
            break;
          }

          setActionStatus('waiting');
          // sleep 2 seconds. This is pretty arbitrary; we should figure out a better way to determine when the page has settled.
          await sleep(2000);
          break
        }
        set((state) => {
          state.currentTask.status = 'success';
        });
      } catch (e: any) {
        onError(e.message);
        set((state) => {
          state.currentTask.status = 'error';
        });
      } finally {
        await detachDebugger(get().currentTask.tabId);
        await reenableExtensions();
      }
    },
    interrupt: () => {
      set((state) => {
        state.currentTask.status = 'interrupted';
      });
    },
    
     // 新增方法：保存当前任务到历史记录
     saveCurrentTaskToHistory: (name: string) => {
      const instructions = get().currentTask.instructions;
      
      if (!instructions) {
        console.error('无法保存历史记录：没有指令内容');
        return;
      }
      
      // 调用 actionHistory 的 saveAction 方法
      get().actionHistory.actions.saveAction(name, instructions);
    }
  },
});
