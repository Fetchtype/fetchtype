import type { Validator } from './validation.js';
import type { Exporter } from './exporter.js';

// -- Plugin interface --

export type FetchTypePlugin = {
  name: string;
  validators?: Validator[];
  exporters?: Exporter[];
};
