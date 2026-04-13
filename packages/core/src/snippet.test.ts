import { describe, expect, it } from 'vitest';
import { generateSnippet } from './snippet.js';

describe('generateSnippet', () => {
  it('generates CSS for a single known font', () => {
    const result = generateSnippet({ primary: 'inter' });
    expect(result.css).toContain('--font-body');
    expect(result.css).toContain('Inter');
    expect(result.fonts.primary).toBeDefined();
    expect(result.fonts.primary!.family).toBe('Inter');
  });

  it('generates CSS with heading + body combination', () => {
    const result = generateSnippet({ primary: 'inter', heading: 'crimson-pro' });
    expect(result.css).toContain('--font-heading');
    expect(result.css).toContain('Crimson Pro');
    expect(result.css).toContain('--font-body');
  });

  it('includes Google Fonts link for known fonts', () => {
    const result = generateSnippet({ primary: 'inter' });
    expect(result.googleFontsLink).toContain('fonts.googleapis.com');
    expect(result.googleFontsLink).toContain('Inter');
  });

  it('generates dark mode by default', () => {
    const result = generateSnippet({ primary: 'inter' });
    expect(result.css).toContain('prefers-color-scheme: dark');
  });

  it('omits dark mode when disabled', () => {
    const result = generateSnippet({ primary: 'inter', darkMode: false });
    expect(result.css).not.toContain('prefers-color-scheme');
  });

  it('applies brand color', () => {
    const result = generateSnippet({ primary: 'inter', brandColor: '#ff6600' });
    expect(result.css).toContain('#ff6600');
  });

  it('generates heading scale', () => {
    const result = generateSnippet({ primary: 'inter' });
    expect(result.css).toContain('--text-h1');
    expect(result.css).toContain('--text-h6');
  });

  it('handles unknown fonts gracefully', () => {
    const result = generateSnippet({ primary: 'my-unknown-font' });
    expect(result.css).toContain('my-unknown-font');
    expect(result.fonts.primary).toBeUndefined();
    expect(result.googleFontsLink).toBe('');
  });

  it('includes mono font when specified', () => {
    const result = generateSnippet({ primary: 'inter', mono: 'jetbrains-mono' });
    expect(result.css).toContain('--font-mono');
    expect(result.css).toContain('JetBrains Mono');
  });

  it('generates fallback overrides for known fonts', () => {
    const result = generateSnippet({ primary: 'inter', fallbacks: true });
    expect(result.css).toContain('Fallback');
  });

  it('generates summary', () => {
    const result = generateSnippet({ primary: 'inter', heading: 'crimson-pro' });
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.summary.some(s => s.includes('Inter'))).toBe(true);
  });

  it('respects different type scales', () => {
    const major = generateSnippet({ primary: 'inter', scale: 'major-third' });
    const fourth = generateSnippet({ primary: 'inter', scale: 'perfect-fourth' });
    // Perfect-fourth produces larger headings
    const majorH1 = major.css.match(/--text-h1:\s*([\d.]+)px/);
    const fourthH1 = fourth.css.match(/--text-h1:\s*([\d.]+)px/);
    expect(Number(fourthH1![1])).toBeGreaterThan(Number(majorH1![1]));
  });
});
