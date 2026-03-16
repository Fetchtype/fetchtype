import { type CatalogEntry, GOOGLE_FONTS_CATALOG } from './catalog.js';

export type SuggestionContext = 'display' | 'interface' | 'reading' | 'mono';

export type FontSuggestion = {
  family: string;
  category: string;
  reason: string;
  variable: boolean;
  sizeKb: number;
};

const CONTEXT_REASONS: Record<SuggestionContext, (entry: CatalogEntry) => string> = {
  display: (entry) =>
    entry.category === 'display' || entry.category === 'serif'
      ? `${entry.family} is a ${entry.category} font with good optical presence for large-scale typography.`
      : `${entry.family} works well at display sizes with its distinctive character.`,
  interface: (entry) =>
    entry.weights.length >= 5
      ? `${entry.family} offers ${entry.weights.length} weights for flexible UI hierarchy.`
      : `${entry.family} is a clean ${entry.category} font suited for application interfaces.`,
  reading: (entry) =>
    entry.category === 'serif'
      ? `${entry.family} is optimized for comfortable long-form reading.`
      : `${entry.family} provides excellent readability for body text.`,
  mono: () => 'Designed for code and technical content with clear character distinction.',
};

export function suggestFonts(
  context: SuggestionContext,
  options?: { limit?: number; variableOnly?: boolean },
): FontSuggestion[] {
  const limit = options?.limit ?? 5;
  const variableOnly = options?.variableOnly ?? false;

  const candidates = GOOGLE_FONTS_CATALOG.filter((entry) => {
    if (!entry.contexts.includes(context)) {
      return false;
    }
    if (variableOnly && !entry.variable) {
      return false;
    }
    return true;
  });

  // Sort: variable fonts first, then by number of weights (more flexible), then by size (smaller better)
  const sorted = candidates.sort((a, b) => {
    if (a.variable !== b.variable) {
      return a.variable ? -1 : 1;
    }
    if (a.weights.length !== b.weights.length) {
      return b.weights.length - a.weights.length;
    }
    return a.sizeKb - b.sizeKb;
  });

  return sorted.slice(0, limit).map((entry) => ({
    family: entry.family,
    category: entry.category,
    reason: CONTEXT_REASONS[context](entry),
    variable: entry.variable,
    sizeKb: entry.sizeKb,
  }));
}
