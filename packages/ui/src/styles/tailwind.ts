// Fetchtype design system tokens
export const fetchTypeTheme = {
  colors: {
    'ft-cream': '#f4f4f0',
    'ft-surface': '#ebebe6',
    'ft-dark': '#1a1a1a',
    'ft-text': '#333333',
    'ft-muted': '#8c8c8c',
    'ft-accent': '#d7361d',
    'ft-accent-hover': '#b82e18',
    'ft-border': '#c8c8c4',
    'ft-code-bg': '#2a2a2a',
  },
  fontFamily: {
    display: ['Newsreader', 'Georgia', 'serif'],
    body: ['DM Sans', 'system-ui', 'sans-serif'],
    mono: ['Space Mono', 'ui-monospace', 'monospace'],
  },
  borderRadius: {
    none: '0px',
    DEFAULT: '0px',
    sm: '0px',
    md: '0px',
    lg: '0px',
    xl: '0px',
    '2xl': '0px',
    '3xl': '0px',
    full: '9999px', // keep full for pills/avatars
  },
  spacing: {
    'ft-xs': '4px',
    'ft-sm': '8px',
    'ft-md': '24px',
    'ft-lg': '64px',
    'ft-xl': '120px',
  },
} as const;
