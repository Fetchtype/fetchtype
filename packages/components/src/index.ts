export type ComponentRecipe = {
  name: string;
  contexts: string[];
  description: string;
};

export const COMPONENT_RECIPES: ComponentRecipe[] = [
  {
    name: 'FetchText',
    contexts: ['body', 'caption', 'label'],
    description: 'Reference text primitive for future React bindings.',
  },
  {
    name: 'FetchHeading',
    contexts: ['heading', 'subheading'],
    description: 'Reference heading primitive for future React bindings.',
  },
  {
    name: 'FetchCode',
    contexts: ['code'],
    description: 'Reference code primitive for future React bindings.',
  },
];
