import { describe, expect, it } from 'vitest';

import { suggestFonts, type SuggestionContext } from './suggest.js';

describe('suggestFonts', () => {
  const contexts: SuggestionContext[] = ['display', 'interface', 'reading', 'mono'];

  for (const context of contexts) {
    it(`returns results for context "${context}"`, () => {
      const results = suggestFonts(context);
      expect(results.length).toBeGreaterThan(0);
      for (const suggestion of results) {
        expect(suggestion.family).toBeTruthy();
        expect(suggestion.category).toBeTruthy();
        expect(suggestion.reason).toBeTruthy();
        expect(typeof suggestion.variable).toBe('boolean');
        expect(suggestion.sizeKb).toBeGreaterThan(0);
      }
    });
  }

  it('respects the limit parameter', () => {
    const results = suggestFonts('interface', { limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
    expect(results.length).toBeGreaterThan(0);
  });

  it('filters to variable-only fonts', () => {
    const results = suggestFonts('interface', { variableOnly: true });
    expect(results.length).toBeGreaterThan(0);
    for (const suggestion of results) {
      expect(suggestion.variable).toBe(true);
    }
  });

  it('defaults to 5 results', () => {
    const results = suggestFonts('interface');
    expect(results.length).toBeLessThanOrEqual(5);
  });
});
