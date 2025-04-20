export const availableActions = [
  {
    name: 'click',
    description: '【Precise Click】Click on a page element (e.g. button/link) using its numeric ID | Must use integer parameter, e.g. click(315)',
    args: [
      {
        name: 'elementId',
        type: 'number',
        description: 'Unique numeric identifier of the target element'
      }
    ]
  },
  {
    name: 'setValue',
    description: '【Text Input】Enter text into a specified input field | Format: setValue(427, "username")',
    args: [
      {
        name: 'elementId',
        type: 'number',
        description: 'Numeric ID of the input field'
      },
      {
        name: 'value',
        type: 'string',
        description: 'Text content to input (quotes auto-added)'
      }
    ]
  },
  {
    name: 'finish',
    description: '【Success Termination】Use when task is fully completed | No parameters needed',
    args: []
  },
  {
    name: 'fail',
    description: '【Failure Termination】Use when unable to locate target/encounter unresolvable errors | No parameters needed',
    args: []
  }
] as const;

type AvailableAction = (typeof availableActions)[number];

type ArgsToObject<T extends ReadonlyArray<{ name: string; type: string }>> = {
  [K in T[number]['name']]: Extract<
    T[number],
    { name: K }
  >['type'] extends 'number'
    ? number
    : string;
};

export type ActionShape<
  T extends {
    name: string;
    args: ReadonlyArray<{ name: string; type: string }>;
  }
> = {
  name: T['name'];
  args: ArgsToObject<T['args']>;
};

export type ActionPayload = {
  [K in AvailableAction['name']]: ActionShape<
    Extract<AvailableAction, { name: K }>
  >;
}[AvailableAction['name']];
