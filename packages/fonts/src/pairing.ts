/**
 * Pairing intelligence module.
 *
 * Curated pairings for top fonts + algorithmic contrast-based fallback
 * for the long tail. Used by the registry enrichment pipeline and
 * the CLI/MCP pair command.
 */

import type { FontEntry, PairingRecommendation } from '@fetchtype/types';
import { loadRegistry, resolveFont } from './registry.js';

// ---------------------------------------------------------------------------
// Curated pairings for popular fonts
// ---------------------------------------------------------------------------

type CuratedPairing = Omit<PairingRecommendation, 'fontId'> & { family: string };

/** Curated pairings for the top fonts by popularity. */
const CURATED_PAIRINGS: Record<string, CuratedPairing[]> = {
  'inter': [
    { family: 'Crimson Pro', role: 'heading', confidence: 0.92, rationale: 'Elegant old-style serif contrasts geometric sans for editorial layouts' },
    { family: 'Fraunces', role: 'heading', confidence: 0.90, rationale: 'Optical-size variable serif with strong display personality pairs cleanly' },
    { family: 'Source Serif 4', role: 'body', confidence: 0.88, rationale: 'Adobe serif with matching x-height for parallel reading columns' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.95, rationale: 'Purpose-built code font with clear character distinction' },
    { family: 'Playfair Display', role: 'heading', confidence: 0.85, rationale: 'High-contrast didone serif for dramatic display headlines' },
  ],
  'roboto': [
    { family: 'Roboto Slab', role: 'heading', confidence: 0.93, rationale: 'Same design family — slab variant provides weight without style clash' },
    { family: 'Merriweather', role: 'body', confidence: 0.87, rationale: 'Screen-optimized serif with compatible metrics for body text' },
    { family: 'Roboto Mono', role: 'mono', confidence: 0.96, rationale: 'Same family monospace with matching proportions' },
    { family: 'Playfair Display', role: 'heading', confidence: 0.82, rationale: 'Classic serif contrast against neo-grotesque sans' },
  ],
  'open-sans': [
    { family: 'Merriweather', role: 'heading', confidence: 0.90, rationale: 'Screen-optimized serif with compatible x-height' },
    { family: 'Lora', role: 'heading', confidence: 0.88, rationale: 'Contemporary serif with calligraphic roots for warm heading contrast' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.90, rationale: 'Adobe monospace with clear letterforms for code blocks' },
  ],
  'montserrat': [
    { family: 'Merriweather', role: 'body', confidence: 0.88, rationale: 'Warm serif balances geometric sans display heads' },
    { family: 'Cardo', role: 'body', confidence: 0.85, rationale: 'Classical serif for long-form reading under geometric headers' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.87, rationale: 'Humanist mono complements geometric sans' },
  ],
  'lato': [
    { family: 'Merriweather', role: 'heading', confidence: 0.89, rationale: 'Warm serif heading with humanist sans body creates balanced hierarchy' },
    { family: 'Lora', role: 'heading', confidence: 0.87, rationale: 'Calligraphic serif adds personality above neutral body text' },
  ],
  'poppins': [
    { family: 'Lora', role: 'body', confidence: 0.86, rationale: 'Warm serif body text under geometric sans headings' },
    { family: 'Libre Baskerville', role: 'body', confidence: 0.84, rationale: 'Classical body serif under modern geometric headers' },
    { family: 'Fira Code', role: 'mono', confidence: 0.88, rationale: 'Ligature-rich monospace pairs with geometric sans' },
  ],
  'source-sans-3': [
    { family: 'Source Serif 4', role: 'heading', confidence: 0.95, rationale: 'Same design family — serif and sans share proportions and metrics' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.97, rationale: 'Same design family — perfect metric alignment across all three' },
  ],
  'raleway': [
    { family: 'Merriweather', role: 'body', confidence: 0.87, rationale: 'Screen serif grounds elegant geometric display font' },
    { family: 'Lora', role: 'body', confidence: 0.85, rationale: 'Warm calligraphic serif as body under elegant sans heads' },
  ],
  'nunito': [
    { family: 'Nunito Sans', role: 'body', confidence: 0.94, rationale: 'Sister font — rounded display with sans body for UI hierarchy' },
    { family: 'Merriweather', role: 'heading', confidence: 0.83, rationale: 'Warm serif heading over friendly rounded sans body' },
  ],
  'playfair-display': [
    { family: 'Lato', role: 'body', confidence: 0.90, rationale: 'Neutral humanist sans grounds high-contrast serif display' },
    { family: 'Source Sans 3', role: 'body', confidence: 0.89, rationale: 'Clean sans body lets didone headlines shine' },
    { family: 'Fira Code', role: 'mono', confidence: 0.80, rationale: 'Modern monospace for technical contexts' },
  ],
  'merriweather': [
    { family: 'Open Sans', role: 'body', confidence: 0.90, rationale: 'Clean sans body under warm serif headings' },
    { family: 'Lato', role: 'body', confidence: 0.89, rationale: 'Neutral humanist sans for comfortable reading' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.87, rationale: 'Matching screen-optimized monospace' },
  ],
  'fira-code': [
    { family: 'Inter', role: 'body', confidence: 0.90, rationale: 'Clean sans for UI and docs around code blocks' },
    { family: 'IBM Plex Sans', role: 'body', confidence: 0.88, rationale: 'Corporate sans for documentation' },
  ],
  'jetbrains-mono': [
    { family: 'Inter', role: 'body', confidence: 0.92, rationale: 'Clean geometric sans for documentation and UI' },
    { family: 'IBM Plex Sans', role: 'body', confidence: 0.89, rationale: 'Structured sans for technical documentation' },
  ],
  'ibm-plex-sans': [
    { family: 'IBM Plex Serif', role: 'heading', confidence: 0.96, rationale: 'Same design family — serif for editorial depth' },
    { family: 'IBM Plex Mono', role: 'mono', confidence: 0.97, rationale: 'Same design family — perfect metric alignment' },
  ],
  'dm-sans': [
    { family: 'DM Serif Display', role: 'heading', confidence: 0.95, rationale: 'Same design family — serif for display contrast' },
    { family: 'DM Mono', role: 'mono', confidence: 0.96, rationale: 'Same design family — matching monospace' },
  ],

  // ---------------------------------------------------------------------------
  // Tier 1 — Top Google Fonts (sans-serif)
  // ---------------------------------------------------------------------------

  'oswald': [
    { family: 'Merriweather', role: 'body', confidence: 0.88, rationale: 'Warm serif body text balances condensed sans headings' },
    { family: 'Open Sans', role: 'body', confidence: 0.86, rationale: 'Clean neutral sans for readable body under bold condensed heads' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.84, rationale: 'Adobe monospace for code blocks in technical contexts' },
  ],
  'pt-sans': [
    { family: 'PT Serif', role: 'heading', confidence: 0.95, rationale: 'Same design superfamily — serif variant provides editorial weight' },
    { family: 'PT Mono', role: 'mono', confidence: 0.96, rationale: 'Same design superfamily — monospace with matching metrics' },
    { family: 'Lora', role: 'heading', confidence: 0.85, rationale: 'Warm calligraphic serif contrasts humanist sans body' },
  ],
  'noto-sans': [
    { family: 'Noto Serif', role: 'heading', confidence: 0.95, rationale: 'Same design superfamily — harmonized serif for multilingual typesetting' },
    { family: 'Noto Sans Mono', role: 'mono', confidence: 0.94, rationale: 'Same superfamily mono with full Unicode alignment' },
    { family: 'Playfair Display', role: 'heading', confidence: 0.83, rationale: 'High-contrast display serif adds editorial drama' },
  ],
  'noto-serif': [
    { family: 'Noto Sans', role: 'body', confidence: 0.95, rationale: 'Same design superfamily — sans body under serif headings' },
    { family: 'Noto Sans Mono', role: 'mono', confidence: 0.94, rationale: 'Same superfamily mono for consistent multilingual code' },
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean geometric sans complements traditional serif headings' },
  ],
  'ubuntu': [
    { family: 'Ubuntu Mono', role: 'mono', confidence: 0.96, rationale: 'Same design family — monospace with matching Canonical identity' },
    { family: 'Lora', role: 'heading', confidence: 0.85, rationale: 'Warm serif heading over friendly humanist sans body' },
    { family: 'Source Serif 4', role: 'heading', confidence: 0.84, rationale: 'Structured serif heading for technical documentation' },
  ],
  'rubik': [
    { family: 'Roboto Slab', role: 'heading', confidence: 0.84, rationale: 'Rounded geometric sans pairs with geometric slab serif' },
    { family: 'Lora', role: 'heading', confidence: 0.86, rationale: 'Calligraphic serif adds warmth to rounded sans body' },
    { family: 'Fira Code', role: 'mono', confidence: 0.85, rationale: 'Rounded monospace complements rounded sans proportions' },
  ],
  'work-sans': [
    { family: 'Merriweather', role: 'heading', confidence: 0.87, rationale: 'Screen serif heading grounds clean grotesque body text' },
    { family: 'Lora', role: 'heading', confidence: 0.86, rationale: 'Warm serif heading over neutral sans body' },
    { family: 'IBM Plex Mono', role: 'mono', confidence: 0.85, rationale: 'Structured monospace for code in professional contexts' },
  ],
  'quicksand': [
    { family: 'EB Garamond', role: 'heading', confidence: 0.84, rationale: 'Classical serif provides gravitas against rounded geometric sans' },
    { family: 'Crimson Pro', role: 'body', confidence: 0.83, rationale: 'Refined serif body anchors playful rounded sans headings' },
    { family: 'Fira Code', role: 'mono', confidence: 0.82, rationale: 'Rounded mono echoes rounded sans geometry' },
  ],
  'barlow': [
    { family: 'Merriweather', role: 'body', confidence: 0.86, rationale: 'Warm serif body under slightly condensed grotesque headings' },
    { family: 'Lora', role: 'body', confidence: 0.85, rationale: 'Calligraphic serif body grounds industrial sans heads' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.84, rationale: 'Neutral monospace for code alongside industrial sans' },
  ],
  'mukta': [
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Warm serif heading complements Devanagari-optimized sans' },
    { family: 'Merriweather', role: 'heading', confidence: 0.83, rationale: 'Screen-optimized serif heading for multilingual layouts' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.82, rationale: 'Clean monospace for code blocks in multilingual docs' },
  ],
  'cabin': [
    { family: 'Merriweather', role: 'heading', confidence: 0.87, rationale: 'Warm serif heading provides editorial contrast to humanist sans' },
    { family: 'Crimson Pro', role: 'body', confidence: 0.84, rationale: 'Elegant serif body under warm humanist sans headings' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.85, rationale: 'Sharp monospace for code alongside humanist sans' },
  ],
  'josefin-sans': [
    { family: 'Josefin Slab', role: 'body', confidence: 0.94, rationale: 'Same design family — slab body under geometric sans headings' },
    { family: 'Lora', role: 'body', confidence: 0.84, rationale: 'Warm serif grounds elegant Art Deco inspired headings' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.82, rationale: 'Clean monospace for code in design-forward layouts' },
  ],
  'dm-serif-display': [
    { family: 'DM Sans', role: 'body', confidence: 0.95, rationale: 'Same design family — sans body under serif display headings' },
    { family: 'DM Mono', role: 'mono', confidence: 0.94, rationale: 'Same design family — matching monospace for code' },
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean geometric sans grounds transitional serif display' },
  ],
  'libre-baskerville': [
    { family: 'Libre Franklin', role: 'body', confidence: 0.93, rationale: 'Same Libre superfamily — Franklin sans body under Baskerville headings' },
    { family: 'Source Sans 3', role: 'body', confidence: 0.86, rationale: 'Neutral sans body for readable text under classical serif heads' },
    { family: 'Fira Code', role: 'mono', confidence: 0.83, rationale: 'Modern monospace for code in editorial contexts' },
  ],
  'libre-franklin': [
    { family: 'Libre Baskerville', role: 'heading', confidence: 0.93, rationale: 'Same Libre superfamily — Baskerville headings over Franklin body' },
    { family: 'Lora', role: 'heading', confidence: 0.86, rationale: 'Warm serif heading complements clean neo-grotesque body' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.85, rationale: 'Sharp monospace for code alongside neo-grotesque sans' },
  ],
  'bitter': [
    { family: 'Source Sans 3', role: 'body', confidence: 0.86, rationale: 'Clean sans body under friendly slab serif headings' },
    { family: 'Open Sans', role: 'body', confidence: 0.85, rationale: 'Neutral sans grounds warm slab serif' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.83, rationale: 'Humanist monospace pairs with slab serif warmth' },
  ],
  'oxygen': [
    { family: 'Merriweather', role: 'heading', confidence: 0.85, rationale: 'Screen serif headings ground clean sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Calligraphic serif provides editorial contrast' },
    { family: 'Ubuntu Mono', role: 'mono', confidence: 0.83, rationale: 'Friendly monospace complements rounded sans proportions' },
  ],
  'arimo': [
    { family: 'Tinos', role: 'heading', confidence: 0.90, rationale: 'Same Croscore family — metrically compatible serif heading' },
    { family: 'Cousine', role: 'mono', confidence: 0.91, rationale: 'Same Croscore family — metrically compatible monospace' },
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Warm serif heading over neutral sans body' },
  ],
  'heebo': [
    { family: 'Merriweather', role: 'heading', confidence: 0.84, rationale: 'Screen serif headings over geometric sans body' },
    { family: 'Crimson Pro', role: 'heading', confidence: 0.83, rationale: 'Refined serif heading for editorial Hebrew/Latin layouts' },
    { family: 'Fira Code', role: 'mono', confidence: 0.84, rationale: 'Ligature monospace for code in technical docs' },
  ],
  'manrope': [
    { family: 'Crimson Pro', role: 'heading', confidence: 0.87, rationale: 'Refined serif heading contrasts geometric-grotesque hybrid sans' },
    { family: 'Source Serif 4', role: 'body', confidence: 0.86, rationale: 'Structured serif body under modern sans headings' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.88, rationale: 'Modern code font pairs with modern sans' },
  ],
  'outfit': [
    { family: 'Lora', role: 'heading', confidence: 0.85, rationale: 'Calligraphic serif heading adds warmth to geometric sans body' },
    { family: 'Source Serif 4', role: 'body', confidence: 0.84, rationale: 'Structured serif body grounds modern geometric sans' },
    { family: 'Fira Code', role: 'mono', confidence: 0.85, rationale: 'Modern monospace pairs with modern geometric sans' },
  ],
  'plus-jakarta-sans': [
    { family: 'Lora', role: 'heading', confidence: 0.86, rationale: 'Warm serif heading provides editorial contrast to modern sans' },
    { family: 'Crimson Pro', role: 'body', confidence: 0.85, rationale: 'Refined serif body under soft geometric sans headings' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.87, rationale: 'Sharp code font complements modern geometric proportions' },
    { family: 'Source Serif 4', role: 'heading', confidence: 0.84, rationale: 'Structured serif heading for technical documentation' },
  ],
  'figtree': [
    { family: 'Merriweather', role: 'heading', confidence: 0.86, rationale: 'Screen serif heading grounds friendly geometric sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.85, rationale: 'Warm serif heading over approachable sans body' },
    { family: 'Fira Code', role: 'mono', confidence: 0.84, rationale: 'Clean monospace for code alongside friendly sans' },
  ],
  'lexend': [
    { family: 'Source Serif 4', role: 'heading', confidence: 0.85, rationale: 'Structured serif heading with readability-focused sans body' },
    { family: 'Merriweather', role: 'heading', confidence: 0.84, rationale: 'Screen-optimized serif heading over accessibility-focused sans' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.86, rationale: 'Clear character distinction matches readability focus' },
  ],
  'urbanist': [
    { family: 'Lora', role: 'heading', confidence: 0.85, rationale: 'Warm calligraphic serif heading contrasts geometric sans body' },
    { family: 'Playfair Display', role: 'heading', confidence: 0.84, rationale: 'High-contrast didone serif for dramatic display over minimal sans' },
    { family: 'Fira Code', role: 'mono', confidence: 0.84, rationale: 'Modern monospace complements geometric sans geometry' },
  ],
  'space-grotesk': [
    { family: 'Space Mono', role: 'mono', confidence: 0.95, rationale: 'Same design family — grotesk and mono share Space proportional logic' },
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Warm serif heading over quirky geometric body' },
    { family: 'Source Serif 4', role: 'body', confidence: 0.83, rationale: 'Structured serif body grounds distinctive geometric sans' },
  ],
  'albert-sans': [
    { family: 'Merriweather', role: 'heading', confidence: 0.85, rationale: 'Screen serif headings ground modern geometric sans body' },
    { family: 'Crimson Pro', role: 'heading', confidence: 0.84, rationale: 'Elegant serif heading over clean geometric body text' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.85, rationale: 'Modern monospace for code alongside geometric sans' },
  ],
  'sora': [
    { family: 'Source Serif 4', role: 'heading', confidence: 0.85, rationale: 'Structured serif heading over geometric sans body' },
    { family: 'Lora', role: 'body', confidence: 0.84, rationale: 'Warm serif body grounds futuristic geometric sans headings' },
    { family: 'Fira Code', role: 'mono', confidence: 0.85, rationale: 'Technical monospace pairs with precise geometric forms' },
  ],
  'red-hat-display': [
    { family: 'Red Hat Text', role: 'body', confidence: 0.96, rationale: 'Same design family — text variant optimized for body sizes' },
    { family: 'Red Hat Mono', role: 'mono', confidence: 0.96, rationale: 'Same design family — matching monospace with Red Hat identity' },
    { family: 'Merriweather', role: 'body', confidence: 0.83, rationale: 'Warm serif body under distinctive display headings' },
  ],
  'red-hat-text': [
    { family: 'Red Hat Display', role: 'heading', confidence: 0.96, rationale: 'Same design family — display variant for headings' },
    { family: 'Red Hat Mono', role: 'mono', confidence: 0.96, rationale: 'Same design family — monospace for code blocks' },
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Warm serif heading over clean text sans body' },
  ],
  'red-hat-mono': [
    { family: 'Red Hat Display', role: 'heading', confidence: 0.95, rationale: 'Same design family — display variant for documentation headings' },
    { family: 'Red Hat Text', role: 'body', confidence: 0.96, rationale: 'Same design family — text variant for body around code' },
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean geometric sans for UI around code blocks' },
  ],
  'karla': [
    { family: 'Merriweather', role: 'heading', confidence: 0.86, rationale: 'Screen serif heading over grotesque sans body text' },
    { family: 'Lora', role: 'heading', confidence: 0.85, rationale: 'Warm calligraphic serif heading contrasts clean grotesque' },
    { family: 'Inconsolata', role: 'mono', confidence: 0.84, rationale: 'Humanist monospace echoes grotesque sans warmth' },
  ],
  'archivo': [
    { family: 'Source Serif 4', role: 'heading', confidence: 0.86, rationale: 'Structured serif heading grounds workhorse grotesque body' },
    { family: 'Merriweather', role: 'heading', confidence: 0.85, rationale: 'Screen serif heading over strong grotesque body text' },
    { family: 'Fira Code', role: 'mono', confidence: 0.84, rationale: 'Technical monospace for code alongside sturdy sans' },
  ],
  'public-sans': [
    { family: 'Merriweather', role: 'heading', confidence: 0.87, rationale: 'Warm serif heading over neutral government-style sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.85, rationale: 'Calligraphic serif heading adds personality to neutral sans' },
    { family: 'IBM Plex Mono', role: 'mono', confidence: 0.86, rationale: 'Professional monospace for code in civic/gov contexts' },
  ],
  'be-vietnam-pro': [
    { family: 'Merriweather', role: 'heading', confidence: 0.85, rationale: 'Screen serif heading over clean geometric sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Warm serif heading adds editorial depth to modern sans' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.85, rationale: 'Modern monospace for code alongside geometric sans' },
  ],
  'catamaran': [
    { family: 'Merriweather', role: 'heading', confidence: 0.84, rationale: 'Screen serif heading over geometric Tamil/Latin sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.83, rationale: 'Calligraphic serif heading for multilingual layouts' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.82, rationale: 'Clean monospace for code in multilingual docs' },
  ],
  'mulish': [
    { family: 'Lora', role: 'heading', confidence: 0.86, rationale: 'Warm serif heading over clean minimal sans body' },
    { family: 'Playfair Display', role: 'heading', confidence: 0.84, rationale: 'Dramatic serif heading against quiet geometric sans body' },
    { family: 'Fira Code', role: 'mono', confidence: 0.84, rationale: 'Modern monospace for code alongside minimal sans' },
  ],
  'hind': [
    { family: 'Merriweather', role: 'heading', confidence: 0.85, rationale: 'Screen serif heading over Devanagari-optimized sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Warm serif heading for multilingual editorial layouts' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.83, rationale: 'Neutral monospace for technical documentation' },
  ],
  'asap': [
    { family: 'Merriweather', role: 'heading', confidence: 0.85, rationale: 'Screen serif heading over rounded humanist sans body' },
    { family: 'Crimson Pro', role: 'heading', confidence: 0.84, rationale: 'Refined serif heading contrasts friendly rounded sans' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.83, rationale: 'Humanist monospace echoes rounded sans warmth' },
  ],
  'overpass': [
    { family: 'Merriweather', role: 'heading', confidence: 0.85, rationale: 'Warm serif heading over open-source grotesque body' },
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Calligraphic serif heading adds editorial depth' },
    { family: 'Overpass Mono', role: 'mono', confidence: 0.93, rationale: 'Same design family — monospace with matching proportions' },
  ],
  'signika': [
    { family: 'Merriweather', role: 'body', confidence: 0.84, rationale: 'Warm serif body under rounded signage-inspired headings' },
    { family: 'Lora', role: 'body', confidence: 0.83, rationale: 'Calligraphic serif body grounds friendly display sans' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.82, rationale: 'Humanist monospace for code alongside rounded sans' },
  ],
  'commissioner': [
    { family: 'Lora', role: 'heading', confidence: 0.86, rationale: 'Warm serif heading over variable geometric-humanist body' },
    { family: 'Source Serif 4', role: 'heading', confidence: 0.85, rationale: 'Structured serif heading for professional layouts' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.86, rationale: 'Modern monospace for code alongside variable sans' },
  ],
  'atkinson-hyperlegible': [
    { family: 'Merriweather', role: 'heading', confidence: 0.86, rationale: 'Screen serif heading over accessibility-optimized body sans' },
    { family: 'Source Serif 4', role: 'heading', confidence: 0.85, rationale: 'Clear serif heading complements legibility-focused body' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.87, rationale: 'High-legibility monospace matches accessibility focus' },
  ],

  // ---------------------------------------------------------------------------
  // Tier 2 — Popular serifs and display fonts
  // ---------------------------------------------------------------------------

  'lora': [
    { family: 'Open Sans', role: 'body', confidence: 0.88, rationale: 'Neutral sans body under warm calligraphic serif headings' },
    { family: 'Lato', role: 'body', confidence: 0.87, rationale: 'Humanist sans body pairs naturally with calligraphic serif' },
    { family: 'Source Sans 3', role: 'body', confidence: 0.86, rationale: 'Clean sans body lets warm serif headings carry the personality' },
    { family: 'Fira Code', role: 'mono', confidence: 0.83, rationale: 'Modern monospace for code blocks in editorial contexts' },
  ],
  'cormorant': [
    { family: 'Inter', role: 'body', confidence: 0.86, rationale: 'Clean geometric sans grounds ornate Garamond-inspired display serif' },
    { family: 'Source Sans 3', role: 'body', confidence: 0.85, rationale: 'Neutral sans body under elegant high-contrast serif headings' },
    { family: 'Fira Code', role: 'mono', confidence: 0.81, rationale: 'Modern monospace for code alongside classical display serif' },
  ],
  'eb-garamond': [
    { family: 'Inter', role: 'body', confidence: 0.87, rationale: 'Clean geometric sans body under classical Garamond headings' },
    { family: 'Source Sans 3', role: 'body', confidence: 0.86, rationale: 'Neutral sans body grounds Renaissance serif display' },
    { family: 'Lato', role: 'body', confidence: 0.85, rationale: 'Humanist sans body under traditional serif headings' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.83, rationale: 'Sharp code font for technical content in editorial layouts' },
  ],
  'spectral': [
    { family: 'Inter', role: 'body', confidence: 0.86, rationale: 'Clean geometric sans body under literary serif headings' },
    { family: 'Open Sans', role: 'body', confidence: 0.85, rationale: 'Neutral sans body for readable text under serif heads' },
    { family: 'Fira Code', role: 'mono', confidence: 0.83, rationale: 'Modern monospace for code in mixed editorial layouts' },
  ],
  'literata': [
    { family: 'Inter', role: 'body', confidence: 0.87, rationale: 'Clean sans body under reading-optimized serif headings' },
    { family: 'Source Sans 3', role: 'body', confidence: 0.86, rationale: 'Neutral sans body designed for screen alongside ebook serif' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.84, rationale: 'Code font with clear letterforms for digital publishing' },
  ],
  'cardo': [
    { family: 'Open Sans', role: 'body', confidence: 0.86, rationale: 'Clean sans body under classical scholarly serif headings' },
    { family: 'Lato', role: 'body', confidence: 0.85, rationale: 'Humanist sans body grounds Bembo-inspired serif' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.82, rationale: 'Neutral monospace for code in academic contexts' },
  ],
  'frank-ruhl-libre': [
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean sans body under strong modern serif headings' },
    { family: 'Open Sans', role: 'body', confidence: 0.84, rationale: 'Neutral sans body for Hebrew/Latin mixed layouts' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.82, rationale: 'Humanist monospace for code in multilingual contexts' },
  ],
  'bodoni-moda': [
    { family: 'Inter', role: 'body', confidence: 0.87, rationale: 'Clean minimal sans body under extreme-contrast didone headings' },
    { family: 'Lato', role: 'body', confidence: 0.86, rationale: 'Neutral humanist sans grounds fashion-forward Bodoni display' },
    { family: 'Source Sans 3', role: 'body', confidence: 0.85, rationale: 'Clean sans body lets dramatic serifs command attention' },
  ],
  'fraunces': [
    { family: 'Inter', role: 'body', confidence: 0.88, rationale: 'Clean geometric sans grounds expressive variable serif display' },
    { family: 'Work Sans', role: 'body', confidence: 0.85, rationale: 'Clean grotesque body under playful old-style serif headings' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.84, rationale: 'Modern monospace for code alongside expressive display serif' },
  ],
  'alegreya': [
    { family: 'Alegreya Sans', role: 'body', confidence: 0.95, rationale: 'Same design family — sans variant for body under serif headings' },
    { family: 'Open Sans', role: 'body', confidence: 0.85, rationale: 'Neutral sans body under calligraphic humanist serif' },
    { family: 'Fira Code', role: 'mono', confidence: 0.82, rationale: 'Modern monospace for code in literary/editorial contexts' },
  ],
  'crimson-text': [
    { family: 'Open Sans', role: 'body', confidence: 0.87, rationale: 'Clean sans body under Garamond-inspired serif headings' },
    { family: 'Lato', role: 'body', confidence: 0.86, rationale: 'Humanist sans body grounds classic serif display' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.83, rationale: 'Neutral monospace for code alongside classical serif' },
  ],
  'crimson-pro': [
    { family: 'Inter', role: 'body', confidence: 0.87, rationale: 'Clean geometric sans body under refined variable serif headings' },
    { family: 'Open Sans', role: 'body', confidence: 0.86, rationale: 'Neutral sans body lets elegant serif headings lead' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.84, rationale: 'Sharp code font complements refined serif design' },
  ],
  'vollkorn': [
    { family: 'Open Sans', role: 'body', confidence: 0.86, rationale: 'Clean sans body under warm bread-and-butter text serif' },
    { family: 'Lato', role: 'body', confidence: 0.85, rationale: 'Humanist sans grounds sturdy everyday serif' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.83, rationale: 'Humanist monospace complements warm text serif' },
  ],
  'gentium-plus': [
    { family: 'Open Sans', role: 'body', confidence: 0.85, rationale: 'Clean sans body under scholarly humanist serif headings' },
    { family: 'Source Sans 3', role: 'body', confidence: 0.84, rationale: 'Neutral sans body for academic multilingual layouts' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.82, rationale: 'Neutral monospace for linguistic and academic code' },
  ],
  'petrona': [
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean sans body under high-contrast variable serif headings' },
    { family: 'Open Sans', role: 'body', confidence: 0.84, rationale: 'Neutral sans body grounds expressive serif display' },
    { family: 'Fira Code', role: 'mono', confidence: 0.82, rationale: 'Modern monospace for code alongside expressive serif' },
  ],
  'baskervville': [
    { family: 'Inter', role: 'body', confidence: 0.87, rationale: 'Clean sans body under refined transitional serif headings' },
    { family: 'Open Sans', role: 'body', confidence: 0.86, rationale: 'Neutral sans body lets Baskerville-inspired headings shine' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.83, rationale: 'Humanist mono pairs with transitional serif warmth' },
  ],
  'newsreader': [
    { family: 'Inter', role: 'body', confidence: 0.86, rationale: 'Clean geometric sans body under editorial serif headings' },
    { family: 'Source Sans 3', role: 'body', confidence: 0.85, rationale: 'Neutral sans body for news and editorial layouts' },
    { family: 'IBM Plex Mono', role: 'mono', confidence: 0.84, rationale: 'Professional monospace for data in journalistic contexts' },
  ],

  // ---------------------------------------------------------------------------
  // Tier 3 — Monospace fonts
  // ---------------------------------------------------------------------------

  'source-code-pro': [
    { family: 'Source Sans 3', role: 'body', confidence: 0.97, rationale: 'Same Adobe design family — perfect metric alignment' },
    { family: 'Source Serif 4', role: 'heading', confidence: 0.96, rationale: 'Same Adobe design family — serif heading over code' },
    { family: 'Inter', role: 'body', confidence: 0.87, rationale: 'Clean geometric sans for UI documentation around code' },
  ],
  'roboto-mono': [
    { family: 'Roboto', role: 'body', confidence: 0.96, rationale: 'Same design family — sans body around monospace code blocks' },
    { family: 'Roboto Slab', role: 'heading', confidence: 0.93, rationale: 'Same design family — slab serif heading for documentation' },
    { family: 'Inter', role: 'body', confidence: 0.86, rationale: 'Clean geometric sans for UI around code' },
  ],
  'ibm-plex-mono': [
    { family: 'IBM Plex Sans', role: 'body', confidence: 0.97, rationale: 'Same design family — sans body around monospace code' },
    { family: 'IBM Plex Serif', role: 'heading', confidence: 0.96, rationale: 'Same design family — serif heading for editorial code docs' },
    { family: 'Inter', role: 'body', confidence: 0.86, rationale: 'Clean sans alternative for UI documentation' },
  ],
  'fira-mono': [
    { family: 'Inter', role: 'body', confidence: 0.87, rationale: 'Clean geometric sans for docs around Fira monospace code' },
    { family: 'Open Sans', role: 'body', confidence: 0.85, rationale: 'Neutral sans body for documentation around code' },
    { family: 'Merriweather', role: 'heading', confidence: 0.83, rationale: 'Screen serif heading for technical documentation' },
  ],
  'space-mono': [
    { family: 'Space Grotesk', role: 'body', confidence: 0.95, rationale: 'Same design family — grotesk body around monospace code' },
    { family: 'Inter', role: 'body', confidence: 0.86, rationale: 'Clean geometric sans for UI around quirky monospace' },
    { family: 'Work Sans', role: 'body', confidence: 0.84, rationale: 'Clean grotesque body grounds distinctive monospace' },
  ],
  'inconsolata': [
    { family: 'Inter', role: 'body', confidence: 0.87, rationale: 'Clean geometric sans for UI around humanist monospace' },
    { family: 'Open Sans', role: 'body', confidence: 0.86, rationale: 'Neutral sans body for documentation alongside code' },
    { family: 'Lora', role: 'heading', confidence: 0.83, rationale: 'Warm serif heading for editorial developer content' },
  ],
  'ubuntu-mono': [
    { family: 'Ubuntu', role: 'body', confidence: 0.96, rationale: 'Same design family — Ubuntu sans body around monospace code' },
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean geometric sans for UI docs around Ubuntu mono' },
    { family: 'Merriweather', role: 'heading', confidence: 0.83, rationale: 'Screen serif heading for technical documentation' },
  ],
  'dm-mono': [
    { family: 'DM Sans', role: 'body', confidence: 0.96, rationale: 'Same design family — sans body around matching monospace' },
    { family: 'DM Serif Display', role: 'heading', confidence: 0.94, rationale: 'Same design family — serif heading for documentation' },
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean geometric sans alternative for UI around code' },
  ],
  'cascadia-code': [
    { family: 'Inter', role: 'body', confidence: 0.88, rationale: 'Clean geometric sans for UI alongside Microsoft terminal mono' },
    { family: 'Open Sans', role: 'body', confidence: 0.85, rationale: 'Neutral sans body for documentation around code' },
    { family: 'Source Serif 4', role: 'heading', confidence: 0.83, rationale: 'Structured serif heading for developer documentation' },
  ],
  'cousine': [
    { family: 'Arimo', role: 'body', confidence: 0.91, rationale: 'Same Croscore family — metrically compatible sans body' },
    { family: 'Tinos', role: 'heading', confidence: 0.90, rationale: 'Same Croscore family — metrically compatible serif heading' },
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean geometric sans for modern UI around code' },
  ],

  // ---------------------------------------------------------------------------
  // Tier 4 — Design system fonts and extras
  // ---------------------------------------------------------------------------

  'noto-sans-display': [
    { family: 'Noto Serif', role: 'body', confidence: 0.93, rationale: 'Same Noto superfamily — serif body under sans display headings' },
    { family: 'Noto Sans Mono', role: 'mono', confidence: 0.92, rationale: 'Same Noto superfamily — matching monospace' },
    { family: 'Lora', role: 'body', confidence: 0.83, rationale: 'Warm serif body under clean display sans headings' },
  ],
  'pt-serif': [
    { family: 'PT Sans', role: 'body', confidence: 0.95, rationale: 'Same design superfamily — sans body under serif headings' },
    { family: 'PT Mono', role: 'mono', confidence: 0.96, rationale: 'Same design superfamily — matching monospace for code' },
    { family: 'Open Sans', role: 'body', confidence: 0.85, rationale: 'Neutral sans body grounds ParaType serif' },
  ],
  'pt-mono': [
    { family: 'PT Sans', role: 'body', confidence: 0.95, rationale: 'Same design superfamily — sans body around matching monospace' },
    { family: 'PT Serif', role: 'heading', confidence: 0.95, rationale: 'Same design superfamily — serif heading for documentation' },
    { family: 'Inter', role: 'body', confidence: 0.84, rationale: 'Clean geometric sans for modern UI around code' },
  ],
  'zilla-slab': [
    { family: 'Inter', role: 'body', confidence: 0.86, rationale: 'Clean geometric sans body under Mozilla slab serif headings' },
    { family: 'Open Sans', role: 'body', confidence: 0.85, rationale: 'Neutral sans body grounds distinctive slab serif' },
    { family: 'Fira Code', role: 'mono', confidence: 0.88, rationale: 'Mozilla Fira monospace matches Zilla open-source identity' },
  ],
  'arvo': [
    { family: 'Open Sans', role: 'body', confidence: 0.86, rationale: 'Clean sans body under geometric slab serif headings' },
    { family: 'Lato', role: 'body', confidence: 0.85, rationale: 'Humanist sans body grounds sturdy slab serif' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.83, rationale: 'Neutral monospace for code alongside geometric slab' },
  ],
  'josefin-slab': [
    { family: 'Josefin Sans', role: 'heading', confidence: 0.94, rationale: 'Same design family — sans headings over slab serif body' },
    { family: 'Open Sans', role: 'body', confidence: 0.84, rationale: 'Neutral sans body under Art Deco slab serif headings' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.82, rationale: 'Clean monospace for code alongside vintage slab serif' },
  ],

  // ---------------------------------------------------------------------------
  // Additional popular sans-serif fonts
  // ---------------------------------------------------------------------------

  'nunito-sans': [
    { family: 'Nunito', role: 'heading', confidence: 0.94, rationale: 'Same design family — rounded variant for display headings' },
    { family: 'Lora', role: 'heading', confidence: 0.85, rationale: 'Warm serif heading over friendly sans body' },
    { family: 'Fira Code', role: 'mono', confidence: 0.84, rationale: 'Modern monospace for code in friendly UI contexts' },
  ],
  'alegreya-sans': [
    { family: 'Alegreya', role: 'heading', confidence: 0.95, rationale: 'Same design family — serif heading over matching sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Warm serif heading over humanist sans body' },
    { family: 'Fira Code', role: 'mono', confidence: 0.82, rationale: 'Modern monospace for code in literary layouts' },
  ],
  'exo-2': [
    { family: 'Merriweather', role: 'body', confidence: 0.84, rationale: 'Warm serif body grounds geometric-futuristic sans headings' },
    { family: 'Lora', role: 'body', confidence: 0.83, rationale: 'Calligraphic serif body anchors tech-forward sans display' },
    { family: 'Fira Code', role: 'mono', confidence: 0.85, rationale: 'Technical monospace matches futuristic sans aesthetic' },
  ],
  'titillium-web': [
    { family: 'Merriweather', role: 'body', confidence: 0.84, rationale: 'Screen serif body grounds academic-born geometric sans' },
    { family: 'Source Serif 4', role: 'heading', confidence: 0.83, rationale: 'Structured serif heading over technical sans body' },
    { family: 'Fira Code', role: 'mono', confidence: 0.85, rationale: 'Technical monospace complements design-school origins' },
  ],
  'assistant': [
    { family: 'Merriweather', role: 'heading', confidence: 0.85, rationale: 'Screen serif heading over clean variable sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Warm serif heading adds editorial depth to modern sans' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.85, rationale: 'Modern monospace for code alongside variable sans' },
  ],
  'maven-pro': [
    { family: 'Merriweather', role: 'body', confidence: 0.84, rationale: 'Warm serif body grounds rounded geometric sans headings' },
    { family: 'Lora', role: 'body', confidence: 0.83, rationale: 'Calligraphic serif body anchors friendly geometric display' },
    { family: 'Fira Code', role: 'mono', confidence: 0.83, rationale: 'Modern monospace for code alongside geometric sans' },
  ],
  'varela-round': [
    { family: 'Merriweather', role: 'heading', confidence: 0.84, rationale: 'Warm serif heading provides editorial contrast to rounded sans' },
    { family: 'Crimson Pro', role: 'body', confidence: 0.83, rationale: 'Refined serif body grounds soft rounded sans headings' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.82, rationale: 'Humanist mono complements rounded sans warmth' },
  ],
  'dosis': [
    { family: 'Merriweather', role: 'body', confidence: 0.84, rationale: 'Screen serif body under rounded geometric sans headings' },
    { family: 'Lora', role: 'body', confidence: 0.83, rationale: 'Calligraphic serif body grounds friendly geometric display' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.82, rationale: 'Neutral monospace for code alongside rounded sans' },
  ],
  'kanit': [
    { family: 'Merriweather', role: 'body', confidence: 0.83, rationale: 'Screen serif body grounds Thai/Latin geometric sans headings' },
    { family: 'Lora', role: 'body', confidence: 0.82, rationale: 'Warm serif body under structured sans headings' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.82, rationale: 'Clean monospace for code in multilingual layouts' },
  ],
  'questrial': [
    { family: 'Merriweather', role: 'heading', confidence: 0.84, rationale: 'Screen serif heading over clean geometric sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.83, rationale: 'Warm serif heading contrasts precise geometric body' },
    { family: 'Fira Code', role: 'mono', confidence: 0.83, rationale: 'Modern monospace for code alongside geometric sans' },
  ],
  'encode-sans': [
    { family: 'Merriweather', role: 'heading', confidence: 0.85, rationale: 'Screen serif heading over variable width sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.84, rationale: 'Warm serif heading adds depth to versatile sans body' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.85, rationale: 'Modern monospace for code alongside variable sans' },
  ],
  'nanum-gothic': [
    { family: 'Nanum Myeongjo', role: 'heading', confidence: 0.93, rationale: 'Same Nanum family — serif heading for Korean/Latin editorial' },
    { family: 'Merriweather', role: 'heading', confidence: 0.83, rationale: 'Screen serif heading for CJK-Latin mixed layouts' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.82, rationale: 'Neutral monospace for code in multilingual docs' },
  ],
  'nanum-myeongjo': [
    { family: 'Nanum Gothic', role: 'body', confidence: 0.93, rationale: 'Same Nanum family — gothic sans body under serif headings' },
    { family: 'Open Sans', role: 'body', confidence: 0.83, rationale: 'Clean sans body for Korean/Latin editorial layouts' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.82, rationale: 'Neutral monospace for code in multilingual contexts' },
  ],
  'sarabun': [
    { family: 'Merriweather', role: 'heading', confidence: 0.83, rationale: 'Screen serif heading for Thai/Latin layouts' },
    { family: 'Lora', role: 'heading', confidence: 0.82, rationale: 'Warm serif heading for multilingual editorial' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.81, rationale: 'Clean monospace for code in Thai/Latin docs' },
  ],
  'prompt': [
    { family: 'Merriweather', role: 'heading', confidence: 0.83, rationale: 'Screen serif heading for Thai/Latin modern layouts' },
    { family: 'Lora', role: 'heading', confidence: 0.82, rationale: 'Warm serif heading for multilingual contexts' },
    { family: 'Fira Code', role: 'mono', confidence: 0.83, rationale: 'Modern monospace for code in Thai/Latin docs' },
  ],
  'noto-sans-mono': [
    { family: 'Noto Sans', role: 'body', confidence: 0.95, rationale: 'Same Noto superfamily — sans body around matching monospace' },
    { family: 'Noto Serif', role: 'heading', confidence: 0.94, rationale: 'Same Noto superfamily — serif heading for documentation' },
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean geometric sans for modern UI around code' },
  ],
  'tinos': [
    { family: 'Arimo', role: 'body', confidence: 0.91, rationale: 'Same Croscore family — metrically compatible sans body' },
    { family: 'Cousine', role: 'mono', confidence: 0.91, rationale: 'Same Croscore family — metrically compatible monospace' },
    { family: 'Open Sans', role: 'body', confidence: 0.85, rationale: 'Neutral sans body under Times-compatible serif headings' },
  ],
  'source-serif-4': [
    { family: 'Source Sans 3', role: 'body', confidence: 0.95, rationale: 'Same Adobe design family — sans body under serif headings' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.97, rationale: 'Same Adobe design family — perfect metric alignment across all three' },
    { family: 'Inter', role: 'body', confidence: 0.86, rationale: 'Clean geometric sans body under structured serif headings' },
  ],
  'roboto-slab': [
    { family: 'Roboto', role: 'body', confidence: 0.93, rationale: 'Same design family — neo-grotesque body under slab serif headings' },
    { family: 'Roboto Mono', role: 'mono', confidence: 0.94, rationale: 'Same design family — monospace for code alongside slab serif' },
    { family: 'Open Sans', role: 'body', confidence: 0.85, rationale: 'Neutral sans body grounds geometric slab serif' },
  ],
  'ibm-plex-serif': [
    { family: 'IBM Plex Sans', role: 'body', confidence: 0.96, rationale: 'Same design family — sans body under matching serif headings' },
    { family: 'IBM Plex Mono', role: 'mono', confidence: 0.97, rationale: 'Same design family — matching monospace for code' },
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean geometric sans alternative for body text' },
  ],
  'overpass-mono': [
    { family: 'Overpass', role: 'body', confidence: 0.93, rationale: 'Same design family — grotesque body around matching monospace' },
    { family: 'Inter', role: 'body', confidence: 0.85, rationale: 'Clean geometric sans for modern UI around code' },
    { family: 'Source Serif 4', role: 'heading', confidence: 0.83, rationale: 'Structured serif heading for developer documentation' },
  ],
  'fira-sans': [
    { family: 'Fira Code', role: 'mono', confidence: 0.93, rationale: 'Same design family — ligature monospace with matching Mozilla identity' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.94, rationale: 'Same design family — monospace without ligatures' },
    { family: 'Merriweather', role: 'heading', confidence: 0.86, rationale: 'Screen serif heading over clean humanist sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.85, rationale: 'Warm serif heading adds editorial depth to humanist sans' },
  ],
  'antic-slab': [
    { family: 'Open Sans', role: 'body', confidence: 0.84, rationale: 'Neutral sans body under friendly slab serif headings' },
    { family: 'Lato', role: 'body', confidence: 0.83, rationale: 'Humanist sans body grounds warm slab serif' },
    { family: 'Fira Mono', role: 'mono', confidence: 0.81, rationale: 'Humanist monospace for code alongside slab serif' },
  ],
  'tenor-sans': [
    { family: 'Merriweather', role: 'heading', confidence: 0.84, rationale: 'Screen serif heading over elegant geometric sans body' },
    { family: 'Lora', role: 'heading', confidence: 0.83, rationale: 'Warm serif heading contrasts refined sans body' },
    { family: 'Source Code Pro', role: 'mono', confidence: 0.82, rationale: 'Clean monospace for code alongside refined sans' },
  ],
  'jost': [
    { family: 'Crimson Pro', role: 'heading', confidence: 0.86, rationale: 'Refined serif heading contrasts Futura-inspired geometric sans' },
    { family: 'Source Serif 4', role: 'body', confidence: 0.85, rationale: 'Structured serif body grounds Bauhaus-inspired headings' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.85, rationale: 'Sharp monospace for code alongside geometric sans' },
  ],
  'inter-tight': [
    { family: 'Crimson Pro', role: 'heading', confidence: 0.87, rationale: 'Refined serif heading over condensed geometric sans body' },
    { family: 'Source Serif 4', role: 'heading', confidence: 0.86, rationale: 'Structured serif heading for compact layout headings' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.88, rationale: 'Same design aesthetic as Inter — tight monospace for code' },
  ],
  'instrument-sans': [
    { family: 'Instrument Serif', role: 'heading', confidence: 0.94, rationale: 'Same design family — serif heading over matching sans body' },
    { family: 'Merriweather', role: 'heading', confidence: 0.84, rationale: 'Screen serif heading over clean modern sans body' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.85, rationale: 'Modern monospace for code alongside clean sans' },
  ],
  'instrument-serif': [
    { family: 'Instrument Sans', role: 'body', confidence: 0.94, rationale: 'Same design family — sans body under matching serif headings' },
    { family: 'Inter', role: 'body', confidence: 0.86, rationale: 'Clean geometric sans body under elegant serif display' },
    { family: 'Fira Code', role: 'mono', confidence: 0.83, rationale: 'Modern monospace for code in editorial layouts' },
  ],
  'wix-madefor-display': [
    { family: 'Merriweather', role: 'body', confidence: 0.84, rationale: 'Screen serif body under purpose-built display sans headings' },
    { family: 'Lora', role: 'body', confidence: 0.83, rationale: 'Warm serif body grounds friendly display sans' },
    { family: 'Fira Code', role: 'mono', confidence: 0.83, rationale: 'Modern monospace for code in web builder contexts' },
  ],
  'bricolage-grotesque': [
    { family: 'Lora', role: 'body', confidence: 0.85, rationale: 'Warm serif body grounds eclectic grotesque display headings' },
    { family: 'Source Serif 4', role: 'body', confidence: 0.84, rationale: 'Structured serif body anchors expressive grotesque' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.84, rationale: 'Modern monospace for code alongside quirky grotesque' },
  ],
  'geist': [
    { family: 'Source Serif 4', role: 'heading', confidence: 0.86, rationale: 'Structured serif heading over Vercel system sans body' },
    { family: 'Crimson Pro', role: 'heading', confidence: 0.85, rationale: 'Refined serif heading contrasts minimal sans body' },
    { family: 'Geist Mono', role: 'mono', confidence: 0.96, rationale: 'Same design family — matching monospace for code' },
    { family: 'JetBrains Mono', role: 'mono', confidence: 0.88, rationale: 'Popular developer monospace for code in Vercel/Next.js projects' },
  ],
  'geist-mono': [
    { family: 'Geist', role: 'body', confidence: 0.96, rationale: 'Same design family — matching sans for UI around code' },
    { family: 'Inter', role: 'body', confidence: 0.88, rationale: 'Clean geometric sans for documentation around code' },
    { family: 'Source Serif 4', role: 'heading', confidence: 0.84, rationale: 'Structured serif heading for developer documentation' },
  ],
};

// ---------------------------------------------------------------------------
// Algorithmic pairing fallback
// ---------------------------------------------------------------------------

type PairingStrategy = {
  targetCategories: string[];
  rationale: string;
};

const CONTRAST_STRATEGIES: Record<string, Record<string, PairingStrategy>> = {
  'sans-serif': {
    heading: { targetCategories: ['serif', 'display'], rationale: 'Serif heading adds contrast over sans body' },
    body: { targetCategories: ['serif'], rationale: 'Serif for long-form reading alongside sans headlines' },
    accent: { targetCategories: ['display', 'handwriting'], rationale: 'Display/decorative font for accent elements' },
    mono: { targetCategories: ['monospace'], rationale: 'Monospace for code and data elements' },
  },
  'serif': {
    heading: { targetCategories: ['sans-serif'], rationale: 'Sans heading provides modern contrast' },
    body: { targetCategories: ['sans-serif'], rationale: 'Sans body for readability under serif headlines' },
    accent: { targetCategories: ['display'], rationale: 'Display font for accent elements' },
    mono: { targetCategories: ['monospace'], rationale: 'Monospace for code and data elements' },
  },
  'monospace': {
    heading: { targetCategories: ['sans-serif'], rationale: 'Sans heading for documentation structure' },
    body: { targetCategories: ['sans-serif'], rationale: 'Sans body for UI around code' },
    accent: { targetCategories: ['sans-serif'], rationale: 'Sans accent for navigation elements' },
    mono: { targetCategories: ['monospace'], rationale: 'Same category for consistent code styling' },
  },
  'display': {
    heading: { targetCategories: ['display', 'serif'], rationale: 'Display or serif for complementary headlines' },
    body: { targetCategories: ['sans-serif', 'serif'], rationale: 'Readable body font under display headlines' },
    accent: { targetCategories: ['sans-serif'], rationale: 'Clean sans for supporting UI elements' },
    mono: { targetCategories: ['monospace'], rationale: 'Monospace for code and data elements' },
  },
  'handwriting': {
    heading: { targetCategories: ['serif', 'sans-serif'], rationale: 'Formal heading under decorative elements' },
    body: { targetCategories: ['sans-serif', 'serif'], rationale: 'Readable body font under decorative headers' },
    accent: { targetCategories: ['sans-serif'], rationale: 'Clean supporting font' },
    mono: { targetCategories: ['monospace'], rationale: 'Monospace for code elements' },
  },
};

/**
 * Generate algorithmic pairing recommendations.
 *
 * Uses contrast-based heuristics: pair sans with serif, geometric with humanist, etc.
 */
function algorithmicPairings(font: FontEntry, role?: 'heading' | 'body' | 'accent' | 'mono'): PairingRecommendation[] {
  const reg = loadRegistry();
  const strategies = CONTRAST_STRATEGIES[font.category] ?? CONTRAST_STRATEGIES['sans-serif']!;
  const roles: ('heading' | 'body' | 'accent' | 'mono')[] = role ? [role] : ['heading', 'body', 'mono'];
  if (!strategies) return [];

  const recommendations: PairingRecommendation[] = [];

  for (const r of roles) {
    const strategy = strategies[r];
    if (!strategy) continue;

    // Find candidate fonts in the target categories
    const candidates = reg.fonts
      .filter(f =>
        f.id !== font.id &&
        f.source !== 'system' &&
        strategy.targetCategories.includes(f.category) &&
        f.weights.length >= 3,
      )
      .slice(0, 100); // Limit search space

    // Score candidates by quality signals
    const scored = candidates.map(c => {
      let score = 0.5;
      if (c.variable) score += 0.1;
      if (c.weights.length >= 6) score += 0.05;
      if (c.hasItalic) score += 0.05;
      if (c.subsets.length >= 3) score += 0.05;
      // Prefer fonts that share subset coverage
      const sharedSubsets = font.subsets.filter(s => c.subsets.includes(s));
      score += Math.min(sharedSubsets.length * 0.02, 0.1);
      return { fontId: c.id, role: r, confidence: Math.min(score, 0.95), rationale: strategy.rationale, source: 'algorithmic' as const };
    });

    scored.sort((a, b) => b.confidence - a.confidence);
    recommendations.push(...scored.slice(0, 3));
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get pairing recommendations for a font.
 *
 * Uses curated data for popular fonts, falls back to algorithmic contrast pairing.
 */
export function recommendPairings(
  idOrFamily: string,
  options?: { role?: 'heading' | 'body' | 'accent' | 'mono'; limit?: number },
): PairingRecommendation[] {
  const font = resolveFont(idOrFamily);
  if (!font) return [];

  const limit = options?.limit ?? 5;
  const role = options?.role;

  // Try curated pairings first
  const curated = CURATED_PAIRINGS[font.id];
  if (curated) {
    const reg = loadRegistry();
    const resolved: PairingRecommendation[] = curated
      .filter(p => !role || p.role === role)
      .flatMap(p => {
        const match = reg.fonts.find(f => f.family === p.family);
        if (!match) return [];
        return [{ fontId: match.id, role: p.role, confidence: p.confidence, rationale: p.rationale, source: 'curated' as const }];
      });

    if (resolved.length >= limit) {
      return resolved.slice(0, limit);
    }

    // Fill remaining slots with algorithmic
    const algoResults = algorithmicPairings(font, role)
      .filter(a => !resolved.some(r => r?.fontId === a.fontId));
    return [...resolved, ...algoResults].slice(0, limit);
  }

  // Algorithmic fallback
  return algorithmicPairings(font, role).slice(0, limit);
}

export type ResolvedPairing = {
  font: FontEntry;
  role: 'heading' | 'body' | 'accent' | 'mono';
  confidence: number;
  rationale: string;
};

/**
 * Resolve pairing recommendations to full FontEntry objects.
 */
export function resolvePairings(
  idOrFamily: string,
  options?: { role?: 'heading' | 'body' | 'accent' | 'mono'; limit?: number },
): ResolvedPairing[] {
  const recs = recommendPairings(idOrFamily, options);
  return recs
    .map(rec => {
      const font = resolveFont(rec.fontId);
      if (!font) return null;
      return { font, role: rec.role, confidence: rec.confidence, rationale: rec.rationale };
    })
    .filter((f): f is ResolvedPairing => f !== null);
}
