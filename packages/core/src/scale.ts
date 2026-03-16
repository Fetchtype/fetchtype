export const SCALE_RATIOS: Record<string, number> = {
  'minor-second': 1.067,
  'major-second': 1.125,
  'minor-third': 1.2,
  'major-third': 1.25,
  'perfect-fourth': 1.333,
  'perfect-fifth': 1.5,
};

export type HeadingSizes = {
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  h5: number;
  h6: number;
};

export function computeHeadingSizes(baseSize: number, ratio: number): HeadingSizes {
  return {
    h6: baseSize,
    h5: baseSize * ratio,
    h4: baseSize * ratio ** 2,
    h3: baseSize * ratio ** 3,
    h2: baseSize * ratio ** 4,
    h1: baseSize * ratio ** 5,
  };
}

type HeadingToken = {
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
};

type HeadingsMap = {
  h1: HeadingToken;
  h2: HeadingToken;
  h3: HeadingToken;
  h4: HeadingToken;
  h5: HeadingToken;
  h6: HeadingToken;
};

function toRem(px: number, basePx: number): string {
  return `${Number((px / basePx).toFixed(4))}rem`;
}

function parseBaseSize(baseSize: string): number {
  const match = baseSize.match(/^(-?\d+(?:\.\d+)?)(rem)?$/);
  if (!match) {
    return 16;
  }
  const value = Number(match[1]);
  return match[2] === 'rem' ? value * 16 : value;
}

export function generateHeadings(baseSize: string, scaleName: string): HeadingsMap {
  const ratio = SCALE_RATIOS[scaleName] ?? 1.25;
  const basePx = parseBaseSize(baseSize);
  const sizes = computeHeadingSizes(basePx, ratio);

  type HeadingKey = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  const weights: Record<HeadingKey, number> = {
    h1: 700,
    h2: 700,
    h3: 650,
    h4: 600,
    h5: 600,
    h6: 600,
  };

  const lineHeights: Record<HeadingKey, number> = {
    h1: 1.05,
    h2: 1.08,
    h3: 1.12,
    h4: 1.2,
    h5: 1.3,
    h6: 1.4,
  };

  const result: Record<string, HeadingToken> = {};
  for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
    const token: HeadingToken = {
      fontSize: toRem(sizes[level], 16),
      fontWeight: weights[level],
      lineHeight: lineHeights[level],
    };
    if (sizes[level] >= 24) {
      token.letterSpacing = '-0.02em';
    }
    result[level] = token;
  }

  return result as HeadingsMap;
}
