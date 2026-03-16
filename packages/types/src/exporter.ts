import type { ExportFormat } from './config.js';
import type { DesignTokenSet } from './tokens.js';

// -- Exporter interface --

export type ExporterOptions = {
  prefix: string;
  theme?: string;
};

export type ExportResult = {
  filename: string;
  content: string;
};

export type Exporter = {
  format: ExportFormat;
  generate: (tokenSet: DesignTokenSet, options: ExporterOptions) => ExportResult;
};
