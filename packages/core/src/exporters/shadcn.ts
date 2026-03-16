import type { DesignTokenSet, ColorTokens } from '@fetchtype/types';

type ShadcnOptions = {
  prefix?: string;
};

function parseHexColor(value: string): [number, number, number] | null {
  const normalized = value.trim();
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) {
    return null;
  }

  const hex =
    normalized.length === 4
      ? normalized
          .slice(1)
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : normalized.slice(1);

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return [red, green, blue];
}

export function hexToHslValues(hex: string): string | null {
  const rgb = parseHexColor(hex);
  if (!rgb) {
    return null;
  }

  const [r, g, b] = rgb;
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  const lightness = (max + min) / 2;

  if (delta === 0) {
    return `0 0% ${Math.round(lightness * 100)}%`;
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));

  let hue: number;
  if (max === rNorm) {
    hue = 60 * (((gNorm - bNorm) / delta) % 6);
  } else if (max === gNorm) {
    hue = 60 * ((bNorm - rNorm) / delta + 2);
  } else {
    hue = 60 * ((rNorm - gNorm) / delta + 4);
  }

  if (hue < 0) {
    hue += 360;
  }

  const h = Number(hue.toFixed(1));
  const s = Number((saturation * 100).toFixed(1));
  const l = Number((lightness * 100).toFixed(1));

  return `${h} ${s}% ${l}%`;
}

type ColorMapping = {
  shadcnVar: string;
  group: keyof ColorTokens;
  token: string;
};

const COLOR_MAPPINGS: ColorMapping[] = [
  { shadcnVar: 'background', group: 'background', token: 'primary' },
  { shadcnVar: 'foreground', group: 'text', token: 'primary' },
  { shadcnVar: 'primary', group: 'interactive', token: 'default' },
  { shadcnVar: 'primary-foreground', group: 'text', token: 'inverse' },
  { shadcnVar: 'secondary', group: 'background', token: 'secondary' },
  { shadcnVar: 'secondary-foreground', group: 'text', token: 'secondary' },
  { shadcnVar: 'muted', group: 'background', token: 'muted' },
  { shadcnVar: 'muted-foreground', group: 'text', token: 'muted' },
  { shadcnVar: 'accent', group: 'background', token: 'accent' },
  { shadcnVar: 'accent-foreground', group: 'text', token: 'accent' },
  { shadcnVar: 'border', group: 'border', token: 'default' },
  { shadcnVar: 'input', group: 'border', token: 'default' },
  { shadcnVar: 'ring', group: 'interactive', token: 'focus' },
];

function getColorValue(
  colors: ColorTokens,
  group: keyof ColorTokens,
  token: string,
): string | null {
  const groupObj = colors[group] as Record<string, { value: string }>;
  const entry = groupObj[token];
  return entry ? entry.value : null;
}

function emitBlock(
  colors: ColorTokens,
  prefix: string | undefined,
): string[] {
  const lines: string[] = [];

  for (const mapping of COLOR_MAPPINGS) {
    const hex = getColorValue(colors, mapping.group, mapping.token);
    if (!hex) {
      continue;
    }

    const hsl = hexToHslValues(hex);
    if (!hsl) {
      continue;
    }

    const varName = prefix ? `--${prefix}-${mapping.shadcnVar}` : `--${mapping.shadcnVar}`;
    lines.push(`  ${varName}: ${hsl};`);
  }

  return lines;
}

export function generateShadcnCss(
  tokenSet: DesignTokenSet,
  options?: ShadcnOptions,
): string {
  const prefix = options?.prefix;
  const lines: string[] = [];

  // :root block (light mode)
  lines.push(':root {');
  lines.push(...emitBlock(tokenSet.color.light, prefix));

  // Add radius
  const radiusVar = prefix ? `--${prefix}-radius` : '--radius';
  lines.push(`  ${radiusVar}: 0.5rem;`);
  lines.push('}');

  // .dark block
  lines.push('');
  lines.push('.dark {');
  lines.push(...emitBlock(tokenSet.color.dark, prefix));
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}
