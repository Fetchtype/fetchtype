export type CatalogEntry = {
  family: string;
  category: 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting';
  weights: number[];
  variable: boolean;
  subsets: string[];
  sizeKb: number;
  contexts: ('display' | 'interface' | 'reading' | 'mono')[];
};

export const GOOGLE_FONTS_CATALOG: CatalogEntry[] = [
  // Sans-serif — interface & display
  {
    family: 'Inter',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'],
    sizeKb: 32,
    contexts: ['interface', 'reading'],
  },
  {
    family: 'Roboto',
    category: 'sans-serif',
    weights: [100, 300, 400, 500, 700, 900],
    variable: false,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'],
    sizeKb: 18,
    contexts: ['interface', 'reading'],
  },
  {
    family: 'Open Sans',
    category: 'sans-serif',
    weights: [300, 400, 500, 600, 700, 800],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'hebrew', 'vietnamese'],
    sizeKb: 22,
    contexts: ['interface', 'reading'],
  },
  {
    family: 'Lato',
    category: 'sans-serif',
    weights: [100, 300, 400, 700, 900],
    variable: false,
    subsets: ['latin', 'latin-ext'],
    sizeKb: 24,
    contexts: ['interface', 'reading'],
  },
  {
    family: 'Montserrat',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'],
    sizeKb: 26,
    contexts: ['display', 'interface'],
  },
  {
    family: 'Source Sans 3',
    category: 'sans-serif',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'],
    sizeKb: 20,
    contexts: ['interface', 'reading'],
  },
  {
    family: 'Noto Sans',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese', 'devanagari'],
    sizeKb: 23,
    contexts: ['interface', 'reading'],
  },
  {
    family: 'Poppins',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variable: false,
    subsets: ['latin', 'latin-ext', 'devanagari'],
    sizeKb: 17,
    contexts: ['interface', 'display'],
  },
  {
    family: 'Raleway',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'],
    sizeKb: 25,
    contexts: ['display', 'interface'],
  },
  {
    family: 'Nunito',
    category: 'sans-serif',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'],
    sizeKb: 21,
    contexts: ['interface', 'reading'],
  },
  {
    family: 'Work Sans',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'vietnamese'],
    sizeKb: 22,
    contexts: ['interface', 'reading'],
  },
  {
    family: 'DM Sans',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext'],
    sizeKb: 20,
    contexts: ['interface', 'display'],
  },
  {
    family: 'Plus Jakarta Sans',
    category: 'sans-serif',
    weights: [200, 300, 400, 500, 600, 700, 800],
    variable: true,
    subsets: ['latin', 'latin-ext', 'vietnamese'],
    sizeKb: 19,
    contexts: ['interface', 'display'],
  },
  {
    family: 'Geist',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext'],
    sizeKb: 30,
    contexts: ['interface', 'display'],
  },

  // Serif — reading & display
  {
    family: 'Source Serif 4',
    category: 'serif',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'vietnamese'],
    sizeKb: 28,
    contexts: ['reading', 'display'],
  },
  {
    family: 'Merriweather',
    category: 'serif',
    weights: [300, 400, 700, 900],
    variable: false,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'],
    sizeKb: 30,
    contexts: ['reading'],
  },
  {
    family: 'Playfair Display',
    category: 'serif',
    weights: [400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'vietnamese'],
    sizeKb: 34,
    contexts: ['display'],
  },
  {
    family: 'Lora',
    category: 'serif',
    weights: [400, 500, 600, 700],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'],
    sizeKb: 26,
    contexts: ['reading', 'display'],
  },
  {
    family: 'Crimson Text',
    category: 'serif',
    weights: [400, 600, 700],
    variable: false,
    subsets: ['latin', 'latin-ext', 'vietnamese'],
    sizeKb: 22,
    contexts: ['reading'],
  },
  {
    family: 'Libre Baskerville',
    category: 'serif',
    weights: [400, 700],
    variable: false,
    subsets: ['latin', 'latin-ext'],
    sizeKb: 30,
    contexts: ['reading'],
  },
  {
    family: 'EB Garamond',
    category: 'serif',
    weights: [400, 500, 600, 700, 800],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'],
    sizeKb: 32,
    contexts: ['reading', 'display'],
  },
  {
    family: 'Noto Serif',
    category: 'serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'],
    sizeKb: 27,
    contexts: ['reading'],
  },
  {
    family: 'PT Serif',
    category: 'serif',
    weights: [400, 700],
    variable: false,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
    sizeKb: 20,
    contexts: ['reading'],
  },

  // Monospace
  {
    family: 'JetBrains Mono',
    category: 'monospace',
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'vietnamese'],
    sizeKb: 28,
    contexts: ['mono'],
  },
  {
    family: 'Fira Code',
    category: 'monospace',
    weights: [300, 400, 500, 600, 700],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext'],
    sizeKb: 42,
    contexts: ['mono'],
  },
  {
    family: 'Source Code Pro',
    category: 'monospace',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'],
    sizeKb: 22,
    contexts: ['mono'],
  },
  {
    family: 'IBM Plex Mono',
    category: 'monospace',
    weights: [100, 200, 300, 400, 500, 600, 700],
    variable: false,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'],
    sizeKb: 18,
    contexts: ['mono'],
  },
  {
    family: 'Inconsolata',
    category: 'monospace',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    variable: true,
    subsets: ['latin', 'latin-ext', 'vietnamese'],
    sizeKb: 16,
    contexts: ['mono'],
  },
  {
    family: 'Space Mono',
    category: 'monospace',
    weights: [400, 700],
    variable: false,
    subsets: ['latin', 'latin-ext', 'vietnamese'],
    sizeKb: 14,
    contexts: ['mono'],
  },

  // Display
  {
    family: 'Oswald',
    category: 'sans-serif',
    weights: [200, 300, 400, 500, 600, 700],
    variable: true,
    subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'],
    sizeKb: 18,
    contexts: ['display'],
  },
  {
    family: 'Bebas Neue',
    category: 'display',
    weights: [400],
    variable: false,
    subsets: ['latin', 'latin-ext'],
    sizeKb: 12,
    contexts: ['display'],
  },
  {
    family: 'Anton',
    category: 'sans-serif',
    weights: [400],
    variable: false,
    subsets: ['latin', 'latin-ext', 'vietnamese'],
    sizeKb: 14,
    contexts: ['display'],
  },
];

export function lookupFont(family: string): CatalogEntry | undefined {
  const normalized = family.toLowerCase().trim();
  return GOOGLE_FONTS_CATALOG.find((entry) => entry.family.toLowerCase() === normalized);
}

export function searchFonts(query: {
  category?: string;
  context?: string;
  variable?: boolean;
}): CatalogEntry[] {
  return GOOGLE_FONTS_CATALOG.filter((entry) => {
    if (query.category !== undefined && entry.category !== query.category) {
      return false;
    }
    if (query.context !== undefined && !entry.contexts.includes(query.context as CatalogEntry['contexts'][number])) {
      return false;
    }
    if (query.variable !== undefined && entry.variable !== query.variable) {
      return false;
    }
    return true;
  });
}
