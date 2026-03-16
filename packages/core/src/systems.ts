import type {
  DesignTokenSet,
  ReferenceEvaluation,
  TypographyPattern,
  TypographyContext,
  TypographySystemKind,
  TypographySystemReference,
  TypographySystemsQuery,
  TypographySystemsResult,
} from '@fetchtype/types';

export const TYPOGRAPHY_SYSTEMS: TypographySystemReference[] = [
  {
    id: 'material-3',
    name: 'Material 3',
    kind: 'official-design-system',
    source: 'Google Material Design 3',
    sourceUrl: 'https://developer.android.com/develop/ui/compose/designsystems/material3',
    summary:
      'Semantic 15-style ramp for adaptive app UI with strong display, title, body, and label roles.',
    useCases: ['mobile-native', 'cross-platform-product', 'consumer-app'],
    styles: ['systematic-ui', 'adaptive-sans', 'semantic-ramp'],
    keywords: [
      'material-3',
      'android',
      'display',
      'headline',
      'title',
      'body',
      'label',
      'adaptive',
      'tokens',
    ],
    fonts: ['Roboto', 'Roboto Flex'],
    characteristics: [
      'Uses named roles instead of exposing only raw point sizes.',
      'Separates expressive large text from compact component text.',
      'Fits product teams that need predictable component mapping.',
      'Good reference for mobile-first systems with responsive scaling.',
    ],
  },
  {
    id: 'apple-hig',
    name: 'Apple Human Interface Guidelines',
    kind: 'official-design-system',
    source: 'Apple Human Interface Guidelines',
    sourceUrl: 'https://developer.apple.com/design/human-interface-guidelines/typography',
    summary:
      'Platform-native text styles built around Dynamic Type, optical consistency, and accessibility scaling.',
    useCases: ['mobile-native', 'cross-platform-product', 'accessibility-first'],
    styles: ['system-native', 'adaptive-sans', 'accessibility-first'],
    keywords: [
      'apple',
      'dynamic type',
      'sf pro',
      'sf compact',
      'new york',
      'text styles',
      'legibility',
      'native',
    ],
    fonts: ['SF Pro', 'SF Compact', 'New York'],
    characteristics: [
      'Use predefined text styles rather than hand-tuned one-off sizes.',
      'Scales through content-size categories, including accessibility sizes.',
      'Preserves platform familiarity across iPhone, iPad, watch, and Mac contexts.',
      'Strong reference for systems where accessibility resizing is non-negotiable.',
    ],
  },
  {
    id: 'carbon',
    name: 'Carbon',
    kind: 'official-design-system',
    source: 'IBM Carbon Design System',
    sourceUrl: 'https://carbondesignsystem.com/elements/typography/type-sets/',
    summary:
      'Enterprise typography system with separate productive and expressive type sets built on IBM Plex.',
    useCases: ['enterprise-saas', 'dashboard-analytics', 'marketing-brand'],
    styles: ['productive-ui', 'expressive-ui', 'enterprise-neutral'],
    keywords: [
      'carbon',
      'ibm plex',
      'productive',
      'expressive',
      'enterprise',
      'data-dense',
      'tokenized',
    ],
    fonts: ['IBM Plex Sans', 'IBM Plex Serif', 'IBM Plex Mono'],
    characteristics: [
      'Splits dense operational UI from richer storytelling surfaces.',
      'Uses a coordinated superfamily for UI, prose, and code.',
      'Balances scale discipline with room for brand expression.',
      'Good reference when one product needs both admin and marketing modes.',
    ],
  },
  {
    id: 'fluent-2',
    name: 'Fluent 2',
    kind: 'official-design-system',
    source: 'Microsoft Fluent 2',
    sourceUrl: 'https://fluent2.microsoft.design/typography',
    summary:
      'Numeric type ramp for broad Microsoft product surfaces with variable-font support and practical legibility.',
    useCases: ['enterprise-saas', 'cross-platform-product', 'productivity-suite'],
    styles: ['humanist-ui', 'systematic-ui', 'enterprise-neutral'],
    keywords: [
      'fluent-2',
      'microsoft',
      'segoe',
      'numeric ramp',
      '20-28',
      'variable font',
      'productivity',
    ],
    fonts: ['Segoe UI Variable', 'Segoe UI'],
    characteristics: [
      'Pairs font size and line height in compact numeric tokens.',
      'Optimized for long-running productivity sessions and dense interfaces.',
      'Uses variable-font flexibility without making the system feel experimental.',
      'Good reference for broad enterprise surfaces spanning web and native apps.',
    ],
  },
  {
    id: 'atlassian',
    name: 'Atlassian Design System',
    kind: 'official-design-system',
    source: 'Atlassian Design System',
    sourceUrl: 'https://atlassian.design/foundations/typography/',
    summary:
      'Compact, rem-based product typography system tuned for collaboration UIs and developer-adjacent workflows.',
    useCases: ['saas-ui', 'developer-tools', 'documentation'],
    styles: ['functional-ui', 'humanist-ui', 'tokenized-scale'],
    keywords: [
      'atlassian',
      'atlassian sans',
      'atlassian mono',
      'rem scale',
      'compact',
      'b2b',
      'collaboration',
    ],
    fonts: ['Atlassian Sans', 'Atlassian Mono'],
    characteristics: [
      'Uses a modest scale progression that behaves well in dense product layouts.',
      'Keeps a tight relationship between UI text, headings, and code snippets.',
      'Strong for tools that mix prose, tables, and workflow controls.',
      'Useful reference when a B2B UI needs clarity without blandness.',
    ],
  },
  {
    id: 'primer',
    name: 'GitHub Primer',
    kind: 'official-design-system',
    source: 'GitHub Primer',
    sourceUrl: 'https://primer.style/product/primitives/typography/',
    summary:
      'Developer-oriented typography primitives balancing neutral UI text, readable documentation, and strong code presentation.',
    useCases: ['developer-tools', 'documentation', 'saas-ui'],
    styles: ['developer-centric', 'neutral-ui', 'mono-technical'],
    keywords: [
      'primer',
      'github',
      'mona sans',
      'hubot sans',
      'documentation',
      'code',
      'developer workflow',
    ],
    fonts: ['Mona Sans', 'Hubot Sans', 'ui-monospace'],
    characteristics: [
      'Treats prose, interface text, and code as separate but coordinated layers.',
      'Works well for product surfaces with adjacent docs and markdown content.',
      'Favors neutrality and rhythm over decorative hierarchy.',
      'Useful reference for tooling products and technical platforms.',
    ],
  },
  {
    id: 'polaris',
    name: 'Shopify Polaris',
    kind: 'official-design-system',
    source: 'Shopify Polaris',
    sourceUrl: 'https://polaris.shopify.com/foundations/typography',
    summary:
      'Commerce-admin typography centered on semantic text components, scannability, and merchant-task efficiency.',
    useCases: ['commerce-admin', 'saas-ui', 'dashboard-analytics'],
    styles: ['functional-ui', 'commerce-conversion', 'tokenized-scale'],
    keywords: [
      'polaris',
      'shopify',
      'merchant',
      'commerce',
      'admin',
      'scannable',
      'semantic text',
    ],
    fonts: ['system-ui'],
    characteristics: [
      'Prioritizes clarity in lists, settings, forms, and operational workflows.',
      'Uses semantic text primitives over highly ornamental headline logic.',
      'Pairs well with dense tables, prices, and status-heavy interfaces.',
      'Useful reference for back-office and merchant tooling.',
    ],
  },
  {
    id: 'uswds',
    name: 'USWDS',
    kind: 'official-design-system',
    source: 'U.S. Web Design System',
    sourceUrl: 'https://designsystem.digital.gov/design-tokens/typesetting/',
    summary:
      'Public-sector typesetting system with explicit guidance for measure, line height, and readable content structure.',
    useCases: ['government-service', 'forms-and-content', 'documentation'],
    styles: ['accessible-public-sector', 'plain-language', 'functional-ui'],
    keywords: [
      'uswds',
      'public sector',
      'measure',
      'line length',
      'line height',
      'forms',
      'readability',
    ],
    fonts: ['Public Sans', 'Merriweather'],
    characteristics: [
      'Encodes readability defaults directly into the system.',
      'Optimized for trustworthy, low-drama service experiences.',
      'Strong reference for high-stakes public content and transactional forms.',
      'Useful when content clarity matters more than brand novelty.',
    ],
  },
  {
    id: 'govuk',
    name: 'GOV.UK Design System',
    kind: 'official-design-system',
    source: 'GOV.UK Design System',
    sourceUrl: 'https://design-system.service.gov.uk/styles/typography/',
    summary:
      'Transaction-oriented service typography using a small set of robust styles and plain-language discipline.',
    useCases: ['government-service', 'forms-and-content', 'transactional-service'],
    styles: ['accessible-public-sector', 'plain-language', 'systematic-ui'],
    keywords: [
      'govuk',
      'service design',
      'plain english',
      'forms',
      'accessible',
      'trust',
      'predictable',
    ],
    fonts: ['GDS Transport', 'Arial', 'sans-serif'],
    characteristics: [
      'Limits style variance so services stay consistent across teams.',
      'Optimized for completion, comprehension, and user confidence.',
      'Strong reference for plain-spoken, high-trust transaction flows.',
      'Useful when typography should feel dependable rather than branded.',
    ],
  },
  {
    id: 'bbc-gel',
    name: 'BBC GEL',
    kind: 'official-design-system',
    source: 'BBC GEL',
    sourceUrl: 'https://bbc.github.io/gel/foundations/typography/',
    summary:
      'Editorial and broadcast typography system balancing responsive headlines, readable body text, and multi-platform clarity.',
    useCases: ['editorial-publishing', 'broadcast-news', 'marketing-brand'],
    styles: ['editorial-serif', 'broadcast-functional', 'responsive-hierarchy'],
    keywords: [
      'bbc',
      'gel',
      'news',
      'headline',
      'editorial',
      'responsive',
      'broadcast',
    ],
    fonts: ['BBC Reith Serif', 'BBC Reith Sans'],
    characteristics: [
      'Balances fast-scanning headlines with calm article reading rhythm.',
      'Works across web, mobile, and living-room surfaces.',
      'Useful reference for content-rich products that need authority and pace.',
      'Good bridge between strict UI systems and classic editorial practice.',
    ],
  },
  {
    id: 'swiss-modernist-grid',
    name: 'Swiss Modernist Grid',
    kind: 'foundational-archetype',
    source: 'Fetchtype curated reference set',
    summary:
      'Neutral grid-first typography with asymmetry, clear hierarchy, and disciplined grotesk usage.',
    useCases: ['branding', 'wayfinding', 'editorial-publishing', 'product-ui'],
    styles: ['neo-grotesk', 'grid-first', 'minimalist'],
    keywords: [
      'swiss',
      'international style',
      'grid',
      'helvetica',
      'univers',
      'asymmetry',
      'objective',
    ],
    fonts: ['Helvetica', 'Univers', 'Akzidenz-Grotesk'],
    characteristics: [
      'Uses scale, spacing, and alignment instead of ornament to create hierarchy.',
      'Strong reference for institutional, cultural, and wayfinding systems.',
      'Useful when a system needs to feel rational and timeless.',
      'Best when paired with rigorous spacing and layout rules.',
    ],
  },
  {
    id: 'humanist-ui-sans',
    name: 'Humanist UI Sans',
    kind: 'foundational-archetype',
    source: 'Fetchtype curated reference set',
    summary:
      'Friendly interface archetype built around open apertures, clear differentiation, and small-size legibility.',
    useCases: ['saas-ui', 'mobile-native', 'forms-and-content'],
    styles: ['humanist-ui', 'accessibility-first', 'functional-ui'],
    keywords: [
      'humanist sans',
      'open apertures',
      'legible',
      'friendly',
      'ui',
      'forms',
      'clarity',
    ],
    fonts: ['Frutiger', 'Myriad', 'Source Sans', 'Segoe UI'],
    characteristics: [
      'Keeps ambiguous glyphs distinct at small sizes.',
      'Useful when a product should feel approachable without losing rigor.',
      'Works well in forms, nav, settings, and public-service content.',
      'Strong baseline archetype for accessible UI systems.',
    ],
  },
  {
    id: 'editorial-old-style-serif',
    name: 'Editorial Old-Style Serif',
    kind: 'foundational-archetype',
    source: 'Fetchtype curated reference set',
    summary:
      'Long-form reading archetype with restrained serif hierarchy, moderate measure, and generous leading.',
    useCases: ['editorial-publishing', 'documentation', 'long-form-reading'],
    styles: ['editorial-serif', 'classic', 'bookish'],
    keywords: [
      'editorial',
      'old-style serif',
      'reading',
      'measure',
      'leading',
      'book',
      'essay',
    ],
    fonts: ['Garamond', 'Georgia', 'Miller', 'Source Serif'],
    characteristics: [
      'Optimizes sustained paragraph reading instead of interface density.',
      'Usually pairs with a neutral sans for captions, UI, or metadata.',
      'Strong reference for essays, docs, and magazine-like experiences.',
      'Works best with explicit line-length rules.',
    ],
  },
  {
    id: 'neo-grotesk-corporate-ui',
    name: 'Neo-Grotesk Corporate UI',
    kind: 'foundational-archetype',
    source: 'Fetchtype curated reference set',
    summary:
      'Dense corporate interface archetype using neutral sans forms, disciplined weights, and restrained personality.',
    useCases: ['enterprise-saas', 'dashboard-analytics', 'branding'],
    styles: ['neo-grotesk', 'corporate-neutral', 'data-dense'],
    keywords: [
      'neo-grotesk',
      'corporate',
      'neutral',
      'inter',
      'helvetica',
      'efficiency',
      'dense',
    ],
    fonts: ['Helvetica Neue', 'Inter', "Suisse Int'l"],
    characteristics: [
      'Supports tables, dashboards, and operational admin surfaces.',
      'Signals competence and control rather than warmth or play.',
      'Useful reference for financial, B2B, and analytics products.',
      'Needs careful spacing to avoid feeling cold or cramped.',
    ],
  },
  {
    id: 'monospace-technical',
    name: 'Monospace Technical',
    kind: 'foundational-archetype',
    source: 'Fetchtype curated reference set',
    summary:
      'Code-forward archetype emphasizing alignment, character distinction, and tabular rhythm for technical surfaces.',
    useCases: ['developer-tools', 'terminal-ui', 'documentation'],
    styles: ['mono-technical', 'data-dense', 'utilitarian'],
    keywords: [
      'monospace',
      'code',
      'terminal',
      'tabular',
      'developer',
      'diagnostics',
      'logs',
    ],
    fonts: ['JetBrains Mono', 'IBM Plex Mono', 'SF Mono'],
    characteristics: [
      'Strong for commands, logs, metrics, and fixed-width alignment.',
      'Should usually be paired with a sans UI layer for comfort.',
      'Useful reference for CLIs, IDEs, and observability tools.',
      'Benefits from tabular figures and restrained hierarchy.',
    ],
  },
  {
    id: 'luxury-fashion-serif',
    name: 'Luxury Fashion Serif',
    kind: 'foundational-archetype',
    source: 'Fetchtype curated reference set',
    summary:
      'High-contrast display-led archetype for premium branding, campaigns, and editorial hero moments.',
    useCases: ['marketing-brand', 'ecommerce-luxury', 'editorial-publishing'],
    styles: ['high-contrast-serif', 'luxury', 'display-led'],
    keywords: [
      'luxury',
      'didone',
      'fashion',
      'editorial',
      'premium',
      'hero',
      'contrast',
    ],
    fonts: ['Didot', 'Canela', 'Bodoni'],
    characteristics: [
      'Best at large sizes with sparse, controlled copy.',
      'Needs a calmer support system for small text and utilities.',
      'Useful reference for brand campaigns and premium product storytelling.',
      'Poor fit for dense operational interfaces.',
    ],
  },
  {
    id: 'signage-wayfinding',
    name: 'Signage Wayfinding',
    kind: 'foundational-archetype',
    source: 'Fetchtype curated reference set',
    summary:
      'Distance-legibility archetype for transport, kiosks, maps, and high-speed public navigation.',
    useCases: ['wayfinding', 'transport', 'public-service'],
    styles: ['wayfinding', 'high-legibility', 'functional'],
    keywords: [
      'signage',
      'wayfinding',
      'transport',
      'distance',
      'legibility',
      'maps',
      'public',
    ],
    fonts: ['Frutiger', 'Transport', 'DIN'],
    characteristics: [
      'Optimized for brief messages that must be understood quickly.',
      'Useful reference for kiosks, event navigation, and public maps.',
      'Pairs typography tightly with iconography and color coding.',
      'Rewards short copy and strong contrast more than elaborate hierarchy.',
    ],
  },
];

export const TYPOGRAPHY_PATTERNS: TypographyPattern[] = [
  {
    id: 'semantic-roles-over-raw-sizes',
    name: 'Semantic roles over raw sizes',
    summary:
      'Mature systems name text by function such as display, title, body, or label instead of only exposing size tokens.',
    keywords: ['semantic roles', 'design tokens', 'component mapping', 'text styles'],
    evidence: ['material-3', 'apple-hig', 'atlassian', 'primer', 'polaris', 'govuk'],
    implications: [
      'Choose names that still work after visual refreshes.',
      'Map roles to product components before tuning the numeric scale.',
      'Keep the public API semantic even if the underlying sizes change.',
    ],
  },
  {
    id: 'productive-and-expressive-modes',
    name: 'Productive and expressive modes',
    summary:
      'Systems that span both utility UI and storytelling surfaces often split into calm operational text and more expressive display modes.',
    keywords: ['productive', 'expressive', 'campaign', 'dual mode'],
    evidence: ['carbon', 'bbc-gel', 'luxury-fashion-serif', 'neo-grotesk-corporate-ui'],
    implications: [
      'Separate day-to-day UI tokens from campaign or editorial moments.',
      'Keep body text conservative even when display text becomes dramatic.',
      'Avoid forcing one scale to cover admin tables and hero banners equally well.',
    ],
  },
  {
    id: 'accessibility-through-defaults',
    name: 'Accessibility through defaults',
    summary:
      'Strong systems make readable line height, predictable scaling, and comfort-oriented defaults automatic rather than optional.',
    keywords: ['accessibility', 'dynamic type', 'line height', 'comfortable defaults'],
    evidence: ['apple-hig', 'uswds', 'govuk', 'material-3', 'humanist-ui-sans'],
    implications: [
      'Bake minimum readable line height and scaling into the base system.',
      'Prefer fewer exceptional cases and more robust defaults.',
      'Treat resizing, contrast, and line length as system behavior, not one-off fixes.',
    ],
  },
  {
    id: 'paired-superfamilies',
    name: 'Paired superfamilies',
    summary:
      'Robust systems often use coordinated sans, serif, and mono families so prose, UI, and code feel related without becoming monotonous.',
    keywords: ['superfamily', 'sans serif mono', 'coordination', 'pairing'],
    evidence: ['carbon', 'atlassian', 'bbc-gel', 'primer', 'monospace-technical'],
    implications: [
      'Prefer families that can cover more than one text context coherently.',
      'Reserve mono for code, diagnostics, or numeric emphasis rather than everything.',
      'Use family changes strategically to signal context shifts.',
    ],
  },
  {
    id: 'tabular-thinking-for-data',
    name: 'Tabular thinking for data surfaces',
    summary:
      'Dashboard, commerce, and developer systems consistently optimize around aligned numbers, restrained widths, and strong scanning rhythm.',
    keywords: ['tabular figures', 'numbers', 'dashboard', 'scannable'],
    evidence: [
      'fluent-2',
      'carbon',
      'primer',
      'polaris',
      'monospace-technical',
      'neo-grotesk-corporate-ui',
    ],
    implications: [
      'Support tabular figures and narrow-but-legible widths where data density matters.',
      'Use mono sparingly as a precision layer for data and commands.',
      'Keep hierarchy obvious even when the layout is compact.',
    ],
  },
  {
    id: 'limited-styles-for-transaction-flows',
    name: 'Limited styles for transaction flows',
    summary:
      'Transaction-heavy services work best when the number of text styles is deliberately small and repeated consistently.',
    keywords: ['limited palette', 'forms', 'transactions', 'consistency'],
    evidence: ['govuk', 'polaris', 'atlassian', 'uswds'],
    implications: [
      'Reduce the number of heading and helper-text variants in form-heavy products.',
      'Favor repetition over novelty in operational interfaces.',
      'Use content structure and spacing to do more of the hierarchy work.',
    ],
  },
  {
    id: 'responsive-display-conservative-body',
    name: 'Responsive display, conservative body',
    summary:
      'Expressive systems allow broader movement in headlines while keeping body text comparatively stable for reading comfort.',
    keywords: ['headline flexibility', 'body stability', 'responsive display'],
    evidence: ['material-3', 'bbc-gel', 'luxury-fashion-serif'],
    implications: [
      'Let marketing and editorial headlines flex more than body tokens.',
      'Avoid aggressive body-size changes across breakpoints.',
      'Protect reading rhythm even when the top of the page is dramatic.',
    ],
  },
  {
    id: 'trust-through-plainness',
    name: 'Trust through plainness',
    summary:
      'High-stakes and public-service systems build trust with low-drama typography, plain language, and predictable spacing.',
    keywords: ['trust', 'plain language', 'public service', 'calm'],
    evidence: ['govuk', 'uswds', 'apple-hig', 'carbon'],
    implications: [
      'Dial down decorative gestures in regulated or high-stakes contexts.',
      'Choose familiarity and clarity before brand theatrics.',
      'Use typography to reduce anxiety and cognitive load.',
    ],
  },
  {
    id: 'measure-and-reading-rhythm',
    name: 'Measure and reading rhythm',
    summary:
      'Editorial and service-content systems repeatedly enforce line length and rhythm instead of treating them as layout afterthoughts.',
    keywords: ['measure', 'line length', 'reading rhythm', 'long-form'],
    evidence: ['uswds', 'govuk', 'editorial-old-style-serif', 'bbc-gel'],
    implications: [
      'Define max prose width explicitly rather than leaving it to container width.',
      'Tune line height and measure together, not independently.',
      'Use paragraph rhythm as a first-class token concern for content products.',
    ],
  },
  {
    id: 'platform-familiarity',
    name: 'Platform familiarity',
    summary:
      'Native and cross-platform systems gain usability by matching the typographic expectations of their host platforms.',
    keywords: ['native', 'platform conventions', 'familiarity', 'system fonts'],
    evidence: ['apple-hig', 'material-3', 'fluent-2'],
    implications: [
      'Use platform defaults when matching host expectations matters more than brand differentiation.',
      'Be cautious about imposing one cross-platform type voice on every surface.',
      'Treat familiarity as a usability feature, not a compromise.',
    ],
  },
];

const AVAILABLE_KINDS: TypographySystemKind[] = [
  'official-design-system',
  'foundational-archetype',
];

type NumericRange = {
  min?: number;
  max?: number;
};

type TypographyFamilyCategory = 'serif' | 'sans' | 'mono' | 'system';

type ReferenceValidationProfile = {
  bodySizePx?: NumericRange;
  bodyLineHeight?: NumericRange;
  proseWidthCh?: NumericRange;
  h1SizePx?: NumericRange;
  preferredScales?: DesignTokenSet['hierarchy']['scale'][];
  bodyCategories?: TypographyFamilyCategory[];
  headingCategories?: TypographyFamilyCategory[];
  expectsGrid?: boolean;
  requiredContexts?: TypographyContext[];
  signalContexts?: TypographyContext[];
};

type ReferenceEvaluationResult = {
  evaluations: ReferenceEvaluation[];
  unknownReferences: string[];
};

const REFERENCE_VALIDATION_PROFILES: Record<string, ReferenceValidationProfile> = {
  'material-3': {
    bodySizePx: { min: 14, max: 17 },
    bodyLineHeight: { min: 1.35, max: 1.65 },
    h1SizePx: { min: 36, max: 64 },
    bodyCategories: ['sans', 'system'],
    headingCategories: ['sans', 'system'],
    requiredContexts: ['label', 'button'],
  },
  'apple-hig': {
    bodySizePx: { min: 16, max: 19 },
    bodyLineHeight: { min: 1.35, max: 1.7 },
    bodyCategories: ['system', 'sans'],
    headingCategories: ['system', 'sans'],
  },
  carbon: {
    bodySizePx: { min: 14, max: 16 },
    bodyLineHeight: { min: 1.35, max: 1.65 },
    bodyCategories: ['sans'],
    headingCategories: ['sans'],
    expectsGrid: true,
    signalContexts: ['code', 'chart-label'],
  },
  'fluent-2': {
    bodySizePx: { min: 12, max: 16 },
    bodyLineHeight: { min: 1.3, max: 1.55 },
    bodyCategories: ['sans', 'system'],
    headingCategories: ['sans', 'system'],
    signalContexts: ['chart-label', 'chart-axis'],
  },
  atlassian: {
    bodySizePx: { min: 14, max: 16 },
    bodyLineHeight: { min: 1.35, max: 1.55 },
    bodyCategories: ['sans'],
    headingCategories: ['sans'],
    signalContexts: ['code'],
  },
  primer: {
    bodySizePx: { min: 15, max: 17 },
    bodyLineHeight: { min: 1.45, max: 1.7 },
    proseWidthCh: { min: 55, max: 75 },
    bodyCategories: ['sans'],
    headingCategories: ['sans'],
    signalContexts: ['code'],
  },
  polaris: {
    bodySizePx: { min: 14, max: 16 },
    bodyLineHeight: { min: 1.35, max: 1.6 },
    bodyCategories: ['sans', 'system'],
    headingCategories: ['sans', 'system'],
    signalContexts: ['label', 'chart-label'],
  },
  uswds: {
    bodySizePx: { min: 16, max: 20 },
    bodyLineHeight: { min: 1.5, max: 1.8 },
    proseWidthCh: { min: 55, max: 75 },
    bodyCategories: ['sans'],
    headingCategories: ['sans', 'serif'],
  },
  govuk: {
    bodySizePx: { min: 16, max: 20 },
    bodyLineHeight: { min: 1.45, max: 1.75 },
    proseWidthCh: { min: 55, max: 75 },
    bodyCategories: ['sans'],
    headingCategories: ['sans'],
    requiredContexts: ['label', 'button', 'input'],
  },
  'bbc-gel': {
    bodySizePx: { min: 16, max: 18 },
    bodyLineHeight: { min: 1.5, max: 1.8 },
    proseWidthCh: { min: 55, max: 75 },
    h1SizePx: { min: 36, max: 60 },
    bodyCategories: ['sans', 'serif'],
    headingCategories: ['sans', 'serif'],
    signalContexts: ['blockquote'],
  },
  'swiss-modernist-grid': {
    bodySizePx: { min: 14, max: 17 },
    bodyLineHeight: { min: 1.35, max: 1.6 },
    bodyCategories: ['sans'],
    headingCategories: ['sans'],
    expectsGrid: true,
  },
  'humanist-ui-sans': {
    bodySizePx: { min: 14, max: 17 },
    bodyLineHeight: { min: 1.45, max: 1.75 },
    bodyCategories: ['sans', 'system'],
    headingCategories: ['sans', 'system'],
    requiredContexts: ['label', 'input'],
  },
  'editorial-old-style-serif': {
    bodySizePx: { min: 16, max: 19 },
    bodyLineHeight: { min: 1.55, max: 1.95 },
    proseWidthCh: { min: 55, max: 75 },
    bodyCategories: ['serif'],
    headingCategories: ['serif', 'sans'],
    signalContexts: ['blockquote'],
  },
  'neo-grotesk-corporate-ui': {
    bodySizePx: { min: 14, max: 16 },
    bodyLineHeight: { min: 1.35, max: 1.55 },
    bodyCategories: ['sans'],
    headingCategories: ['sans'],
    expectsGrid: true,
    signalContexts: ['chart-label', 'chart-axis'],
  },
  'monospace-technical': {
    bodySizePx: { min: 13, max: 16 },
    bodyLineHeight: { min: 1.4, max: 1.65 },
    bodyCategories: ['mono'],
    headingCategories: ['mono', 'sans'],
    requiredContexts: ['code'],
  },
  'luxury-fashion-serif': {
    bodySizePx: { min: 15, max: 18 },
    bodyLineHeight: { min: 1.45, max: 1.8 },
    h1SizePx: { min: 48, max: 90 },
    bodyCategories: ['serif', 'sans'],
    headingCategories: ['serif'],
  },
  'signage-wayfinding': {
    bodySizePx: { min: 15, max: 20 },
    bodyLineHeight: { min: 1.2, max: 1.5 },
    h1SizePx: { min: 32, max: 72 },
    bodyCategories: ['sans'],
    headingCategories: ['sans'],
  },
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matchesFilter(values: string[], filter: string | undefined): boolean {
  if (!filter) {
    return true;
  }

  const normalizedFilter = normalize(filter);
  return values.some((value) => {
    const normalizedValue = normalize(value);
    return normalizedValue === normalizedFilter || normalizedValue.includes(normalizedFilter);
  });
}

function matchesQuery(system: TypographySystemReference, query: string | undefined): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = normalize(query);
  const haystack = [
    system.id,
    system.name,
    system.source,
    system.summary,
    ...system.useCases,
    ...system.styles,
    ...system.keywords,
    ...system.fonts,
    ...system.characteristics,
  ]
    .map((value) => normalize(value))
    .join(' ');

  return haystack.includes(normalizedQuery);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toPx(value: string | number): number | null {
  if (typeof value === 'number') {
    return value;
  }

  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em|ch)?$/);
  if (!match) {
    return null;
  }

  const numeric = Number(match[1]);
  const unit = match[2] ?? null;

  if (unit === null || unit === 'px') {
    return numeric;
  }

  if (unit === 'rem' || unit === 'em') {
    return numeric * 16;
  }

  return null;
}

function toCh(value: string): number | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(ch)$/);
  return match ? Number(match[1]) : null;
}

function toUnitlessLineHeight(
  lineHeight: string | number,
  fontSize: string | number,
): number | null {
  if (typeof lineHeight === 'number') {
    return lineHeight;
  }

  const lineHeightPx = toPx(lineHeight);
  const fontSizePx = toPx(fontSize);

  if (lineHeightPx !== null && fontSizePx !== null && fontSizePx > 0) {
    return lineHeightPx / fontSizePx;
  }

  const numeric = Number(lineHeight);
  return Number.isNaN(numeric) ? null : numeric;
}

function isWithinRange(value: number | null, range: NumericRange): boolean {
  if (value === null) {
    return false;
  }

  if (range.min !== undefined && value < range.min) {
    return false;
  }

  if (range.max !== undefined && value > range.max) {
    return false;
  }

  return true;
}

function describeRange(range: NumericRange, unit = ''): string {
  const min = range.min !== undefined ? `${range.min}${unit}` : undefined;
  const max = range.max !== undefined ? `${range.max}${unit}` : undefined;

  if (min && max) {
    return `${min}-${max}`;
  }

  return min ?? max ?? 'configured range';
}

function toFontFamilies(fontFamily: string | string[]): string[] {
  return Array.isArray(fontFamily)
    ? fontFamily
    : fontFamily.split(',').map((value) => value.trim());
}

function detectFamilyCategory(fontFamily: string | string[]): TypographyFamilyCategory {
  const normalizedFamilies = toFontFamilies(fontFamily).map((value) => value.toLowerCase());
  const joined = normalizedFamilies.join(' ');

  if (
    joined.includes('mono') ||
    joined.includes('monospace') ||
    joined.includes('jetbrains') ||
    joined.includes('menlo') ||
    joined.includes('consolas') ||
    joined.includes('courier')
  ) {
    return 'mono';
  }

  if (joined.includes('system-ui') || joined.includes('ui-sans') || joined.includes('sf pro')) {
    return 'system';
  }

  if (
    joined.includes('serif') ||
    joined.includes('georgia') ||
    joined.includes('garamond') ||
    joined.includes('baskerville') ||
    joined.includes('merriweather') ||
    joined.includes('times') ||
    joined.includes('didot') ||
    joined.includes('bodoni') ||
    joined.includes('canela') ||
    joined.includes('new york') ||
    joined.includes('iowan')
  ) {
    return 'serif';
  }

  return 'sans';
}

function summarizeEvaluation(
  system: TypographySystemReference,
  score: number,
  matched: string[],
  mismatched: string[],
): string {
  const strongTraits = matched.slice(0, 2).join('; ') || 'no strong trait matches yet';
  const mainGap = mismatched[0] ?? 'no notable gaps';
  return `${system.name}: ${score}% alignment. Matches ${strongTraits}. Main gap: ${mainGap}.`;
}

export function getTypographySystemById(id: string): TypographySystemReference | undefined {
  return TYPOGRAPHY_SYSTEMS.find((system) => system.id === id);
}

export function getAllTypographySystemIds(): string[] {
  return TYPOGRAPHY_SYSTEMS.map((system) => system.id);
}

export function evaluateTypographyReferences(
  tokenSet: DesignTokenSet,
  referenceIds: string[],
): ReferenceEvaluationResult {
  const evaluations: ReferenceEvaluation[] = [];
  const unknownReferences: string[] = [];

  const bodyToken = tokenSet.typography.body;
  const headingToken = tokenSet.typography.heading;
  const bodyCategory = bodyToken ? detectFamilyCategory(bodyToken.fontFamily) : null;
  const headingCategory = headingToken ? detectFamilyCategory(headingToken.fontFamily) : null;
  const bodySizePx = bodyToken ? toPx(bodyToken.fontSize) : null;
  const bodyLineHeight = bodyToken
    ? toUnitlessLineHeight(bodyToken.lineHeight, bodyToken.fontSize)
    : null;
  const proseWidthCh = toCh(tokenSet.layout.maxWidth.prose);
  const h1SizePx = toPx(tokenSet.hierarchy.headings.h1.fontSize);
  const availableContexts = new Set(
    Object.entries(tokenSet.typography)
      .filter(([, value]) => value !== undefined)
      .map(([context]) => context as TypographyContext),
  );

  for (const referenceId of referenceIds) {
    const system = getTypographySystemById(referenceId);
    const profile = REFERENCE_VALIDATION_PROFILES[referenceId];

    if (!system || !profile) {
      unknownReferences.push(referenceId);
      continue;
    }

    const matched: string[] = [];
    const mismatched: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    if (profile.bodySizePx) {
      totalChecks += 1;
      if (isWithinRange(bodySizePx, profile.bodySizePx)) {
        matched.push(`body size sits in the ${describeRange(profile.bodySizePx, 'px')}px range`);
        passedChecks += 1;
      } else {
        mismatched.push(
          `body size should sit near ${describeRange(profile.bodySizePx, 'px')}px`,
        );
      }
    }

    if (profile.bodyLineHeight) {
      totalChecks += 1;
      if (isWithinRange(bodyLineHeight, profile.bodyLineHeight)) {
        matched.push(
          `body line-height fits the ${describeRange(profile.bodyLineHeight)} reference rhythm`,
        );
        passedChecks += 1;
      } else {
        mismatched.push(
          `body line-height should sit near ${describeRange(profile.bodyLineHeight)}`,
        );
      }
    }

    if (profile.proseWidthCh) {
      totalChecks += 1;
      if (isWithinRange(proseWidthCh, profile.proseWidthCh)) {
        matched.push(`prose width fits the ${describeRange(profile.proseWidthCh, 'ch')}ch range`);
        passedChecks += 1;
      } else {
        mismatched.push(
          `prose width should sit near ${describeRange(profile.proseWidthCh, 'ch')}ch`,
        );
      }
    }

    if (profile.h1SizePx) {
      totalChecks += 1;
      if (isWithinRange(h1SizePx, profile.h1SizePx)) {
        matched.push(`h1 size matches the ${describeRange(profile.h1SizePx, 'px')}px display band`);
        passedChecks += 1;
      } else {
        mismatched.push(`h1 size should sit near ${describeRange(profile.h1SizePx, 'px')}px`);
      }
    }

    if (profile.preferredScales) {
      totalChecks += 1;
      if (profile.preferredScales.includes(tokenSet.hierarchy.scale)) {
        matched.push(`scale "${tokenSet.hierarchy.scale}" matches the reference direction`);
        passedChecks += 1;
      } else {
        mismatched.push(
          `scale should favor ${profile.preferredScales.join(', ')} rather than "${tokenSet.hierarchy.scale}"`,
        );
      }
    }

    if (profile.bodyCategories && bodyCategory) {
      totalChecks += 1;
      if (profile.bodyCategories.includes(bodyCategory)) {
        matched.push(`body font category "${bodyCategory}" fits the reference`);
        passedChecks += 1;
      } else {
        mismatched.push(
          `body font should feel ${profile.bodyCategories.join(' or ')} rather than ${bodyCategory}`,
        );
      }
    }

    if (profile.headingCategories && headingCategory) {
      totalChecks += 1;
      if (profile.headingCategories.includes(headingCategory)) {
        matched.push(`heading font category "${headingCategory}" fits the reference`);
        passedChecks += 1;
      } else {
        mismatched.push(
          `heading font should feel ${profile.headingCategories.join(' or ')} rather than ${headingCategory}`,
        );
      }
    }

    if (profile.expectsGrid !== undefined) {
      totalChecks += 1;
      const hasGrid = tokenSet.layout.grid !== undefined;
      if (hasGrid === profile.expectsGrid) {
        matched.push(
          profile.expectsGrid
            ? 'grid tokens are present, which supports this reference'
            : 'grid tokens are omitted, which suits this reference',
        );
        passedChecks += 1;
      } else {
        mismatched.push(
          profile.expectsGrid
            ? 'a defined layout grid would strengthen this reference fit'
            : 'a lighter layout system would better fit this reference',
        );
      }
    }

    if (profile.requiredContexts) {
      totalChecks += 1;
      const missingContexts = profile.requiredContexts.filter(
        (context) => !availableContexts.has(context),
      );
      if (missingContexts.length === 0) {
        matched.push(`required contexts are present: ${profile.requiredContexts.join(', ')}`);
        passedChecks += 1;
      } else {
        mismatched.push(`missing reference contexts: ${missingContexts.join(', ')}`);
      }
    }

    if (profile.signalContexts) {
      totalChecks += 1;
      const hasSignalContext = profile.signalContexts.some((context) => availableContexts.has(context));
      if (hasSignalContext) {
        matched.push(`signal contexts support the reference: ${profile.signalContexts.join(', ')}`);
        passedChecks += 1;
      } else {
        mismatched.push(`add one of these contexts to better match the reference: ${profile.signalContexts.join(', ')}`);
      }
    }

    const score = totalChecks === 0 ? 0 : Math.round((passedChecks / totalChecks) * 100);

    evaluations.push({
      referenceId: system.id,
      referenceName: system.name,
      score,
      matched,
      mismatched,
      summary: summarizeEvaluation(system, score, matched, mismatched),
    });
  }

  return { evaluations, unknownReferences };
}

export function findBestTypographyReferences(
  tokenSet: DesignTokenSet,
  limit = 3,
): ReferenceEvaluation[] {
  const { evaluations } = evaluateTypographyReferences(tokenSet, getAllTypographySystemIds());
  return evaluations
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function queryTypographySystems(
  options: TypographySystemsQuery = {},
): TypographySystemsResult {
  const kind = options.kind ?? 'all';
  const systems = TYPOGRAPHY_SYSTEMS.filter((system) => {
    if (kind !== 'all' && system.kind !== kind) {
      return false;
    }

    if (!matchesFilter(system.useCases, options.useCase)) {
      return false;
    }

    if (!matchesFilter(system.styles, options.style)) {
      return false;
    }

    return matchesQuery(system, options.query);
  });

  const matchingSystemIds = new Set(systems.map((system) => system.id));
  const patterns =
    options.includePatterns === false
      ? []
      : TYPOGRAPHY_PATTERNS.filter((pattern) =>
          pattern.evidence.some((systemId) => matchingSystemIds.has(systemId)),
        );

  return {
    systems,
    patterns,
    availableUseCases: uniqueSorted(TYPOGRAPHY_SYSTEMS.flatMap((system) => system.useCases)),
    availableStyles: uniqueSorted(TYPOGRAPHY_SYSTEMS.flatMap((system) => system.styles)),
    availableKinds: AVAILABLE_KINDS,
  };
}
