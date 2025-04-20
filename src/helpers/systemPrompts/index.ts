import { prompt_01 } from "./prompt_01";
import { prompt_02 } from "./prompt_02";
import { prompt_03 } from "./prompt_03";
import { prompt_04 } from "./prompt_04";
import { prompt_06 } from "./prompt_06";
import { promptdefault } from "./prompt_defuat";
import { availableActions } from "../availableActions";


const formattedActions = availableActions
  .map((action, i) => {
    const args = action.args
      .map((arg) => `${arg.name}: ${arg.type}`)
      .join(', ');
    return `${i + 1}. ${action.name}(${args}): ${action.description}`;
  })
  .join('\n');

export function processSystemPrompt(systemPrompt: string): string {
  return systemPrompt.replace('{{ActionsTools}}', formattedActions);
}
  
// 导出默认提示词函数
export default processSystemPrompt;