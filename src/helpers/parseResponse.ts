import { ActionPayload, availableActions } from './availableActions';

export type ParsedResponseSuccess = {
  thought: string;
  action: string;
  parsedAction: ActionPayload;
  // 新增字段，用于存储多个action
  parsedActions?: ActionPayload[];
};

export type ParsedResponse =
  | ParsedResponseSuccess
  | {
      error: string;
    };

export function parseResponse(text: string): ParsedResponse {
  console.log('Parsing response:', text);
  const thoughtMatch = text.match(/<Thought>([\s\S]*?)<\/Thought>/);
  const actionMatch = text.match(/<Action>([\s\S]*?)<\/Action>/);

  if (!thoughtMatch) {
    return {
      error: 'Invalid response: Thought not found in the model response.',
    };
  }

  if (!actionMatch) {
    return {
      error: 'Invalid response: Action not found in the model response.',
    };
  }

  const thought = thoughtMatch[1];
  const actionString = actionMatch[1];
  
  // 检查是否有多个action（每行一个）
  const actionLines = actionString.trim().split('\n').filter(line => line.trim() !== '');
  
  if (actionLines.length === 0) {
    return {
      error: 'Invalid action format: No valid actions found.',
    };
  }
  
  // 解析所有action
  const parsedActions: ActionPayload[] = [];
  let parseError: string | null = null;
  
  for (const line of actionLines) {
    const actionPattern = /(\w+)\((.*?)\)/;
    const actionParts = line.match(actionPattern);
    
    if (!actionParts) {
      parseError = `Invalid action format: "${line}" should be in the format functionName(arg1, arg2, ...).`;
      break;
    }
    
    const actionName = actionParts[1];
    const actionArgsString = actionParts[2];
    
    const availableAction = availableActions.find(
      (action) => action.name === actionName
    );
    
    if (!availableAction) {
      parseError = `Invalid action: "${actionName}" is not a valid action.`;
      break;
    }
    
    const argsArray = actionArgsString
      .split(',')
      .map((arg) => arg.trim())
      .filter((arg) => arg !== '');
    const parsedArgs: Record<string, number | string> = {};
    
    if (argsArray.length !== availableAction.args.length) {
      parseError = `Invalid number of arguments: Expected ${availableAction.args.length} for action "${actionName}", but got ${argsArray.length}.`;
      break;
    }
    
    let argError = false;
    
    for (let i = 0; i < argsArray.length; i++) {
      const arg = argsArray[i];
      const expectedArg = availableAction.args[i];
      
      if (expectedArg.type === 'number') {
        const numberValue = Number(arg);
        
        if (isNaN(numberValue)) {
          parseError = `Invalid argument type: Expected a number for argument "${expectedArg.name}", but got "${arg}".`;
          argError = true;
          break;
        }
        
        parsedArgs[expectedArg.name] = numberValue;
      } else if (expectedArg.type === 'string') {
        // 支持带引号和不带引号的字符串
        let stringValue: string;
        if (arg.startsWith('"') && arg.endsWith('"')) {
          stringValue = arg.slice(1, -1);
        } else if (arg.startsWith("'") && arg.endsWith("'")) {
          stringValue = arg.slice(1, -1);
        } else {
          // 对于不带引号的情况，直接使用原始值
          stringValue = arg;
        }
        
        parsedArgs[expectedArg.name] = stringValue;
      } else {
        // @ts-expect-error this is here to make sure we don't forget to update this code if we add a new arg type
        parseError = `Invalid argument type: Unknown type "${expectedArg.type}" for argument "${expectedArg.name}".`;
        argError = true;
        break;
      }
    }
    
    if (argError) {
      break;
    }
    
    parsedActions.push({
      name: availableAction.name,
      args: parsedArgs,
    } as ActionPayload);
  }
  
  if (parseError) {
    return {
      error: parseError,
    };
  }
  
  // 为了保持向后兼容，我们仍然返回第一个action作为主要的parsedAction
  return {
    thought,
    action: actionString,
    parsedAction: parsedActions[0],
    parsedActions: parsedActions,
  };
}