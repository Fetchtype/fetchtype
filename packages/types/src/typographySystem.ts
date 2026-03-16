export type TypographySystemKind = 'official-design-system' | 'foundational-archetype';

export type TypographySystemQueryKind = TypographySystemKind | 'all';

export type TypographySystemReference = {
  id: string;
  name: string;
  kind: TypographySystemKind;
  source: string;
  sourceUrl?: string;
  summary: string;
  useCases: string[];
  styles: string[];
  keywords: string[];
  fonts: string[];
  characteristics: string[];
};

export type TypographyPattern = {
  id: string;
  name: string;
  summary: string;
  keywords: string[];
  evidence: string[];
  implications: string[];
};

export type TypographySystemsQuery = {
  query?: string;
  useCase?: string;
  style?: string;
  kind?: TypographySystemQueryKind;
  includePatterns?: boolean;
};

export type TypographySystemsResult = {
  systems: TypographySystemReference[];
  patterns: TypographyPattern[];
  availableUseCases: string[];
  availableStyles: string[];
  availableKinds: TypographySystemKind[];
};
