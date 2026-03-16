/**
 * enrich-tags.ts
 *
 * Enriches the `tags` array for every font in registry.json using
 * classification rules, family-name heuristics, and known-font mappings.
 *
 * Usage:  npx tsx scripts/enrich-tags.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Paths ───────────────────────────────────────────────────────────────────

const REGISTRY_PATH = resolve(
  __dirname,
  "../packages/fonts/data/registry.json",
);

// ── Types ───────────────────────────────────────────────────────────────────

interface Axis {
  tag: string;
  name: string;
  min: number;
  max: number;
  default: number;
  step: number;
  cssProperty: string;
}

interface FontEntry {
  id: string;
  family: string;
  category: string;
  tags: string[];
  variable: boolean;
  axes: Axis[];
  weights: number[];
  styles: string[];
  subsets: string[];
  hasItalic: boolean;
  hasOpticalSizing: boolean;
  [key: string]: unknown;
}

interface Registry {
  version: string;
  generatedAt: string;
  count: number;
  fonts: FontEntry[];
}

// ── Known font → tag mappings ───────────────────────────────────────────────

const KNOWN_TAGS: Record<string, string[]> = {};

function registerKnown(families: string[], tags: string[]) {
  for (const f of families) {
    KNOWN_TAGS[f] = tags;
  }
}

// Sans-serif geometric
registerKnown(
  [
    "Inter",
    "Nunito",
    "Poppins",
    "Montserrat",
    "Raleway",
    "Jost",
    "DM Sans",
    "Outfit",
    "Sora",
    "Albert Sans",
    "Plus Jakarta Sans",
    "Figtree",
    "Red Hat Display",
    "Red Hat Text",
    "Work Sans",
    "Lexend",
    "Urbanist",
    "Manrope",
    "Exo",
    "Exo 2",
    "Rubik",
    "Quicksand",
  ],
  ["geometric"],
);

// Sans-serif humanist
registerKnown(
  [
    "Open Sans",
    "Lato",
    "Source Sans 3",
    "Noto Sans",
    "Cabin",
    "Fira Sans",
    "Libre Franklin",
    "IBM Plex Sans",
    "Karla",
    "Barlow",
    "Mulish",
    "Catamaran",
    "Hind",
    "Arimo",
    "Assistant",
    "Asap",
    "Maven Pro",
    "Signika",
    "Overpass",
    "Sarabun",
  ],
  ["humanist"],
);

// Sans-serif neo-grotesque
registerKnown(
  [
    "Roboto",
    "Helvetica",
    "Arial",
    "Archivo",
    "Public Sans",
    "Be Vietnam Pro",
    "Chivo",
    "Pathway Gothic One",
    "Schibsted Grotesk",
    "Geist",
  ],
  ["neo-grotesque"],
);

// Serif transitional
registerKnown(
  [
    "Merriweather",
    "Noto Serif",
    "PT Serif",
    "Libre Baskerville",
    "Source Serif 4",
    "IBM Plex Serif",
    "Frank Ruhl Libre",
    "Baskervville",
  ],
  ["transitional"],
);

// Serif old-style
registerKnown(
  [
    "Crimson Text",
    "Crimson Pro",
    "Cormorant",
    "EB Garamond",
    "Garamond",
    "Cardo",
    "Spectral",
    "Gentium Plus",
    "Literata",
    "Petrona",
  ],
  ["old-style"],
);

// Serif modern/didone
registerKnown(
  [
    "Playfair Display",
    "Abril Fatface",
    "Bodoni Moda",
    "DM Serif Display",
    "DM Serif Text",
    "Oranienbaum",
  ],
  ["didone", "high-contrast"],
);

// Serif slab
registerKnown(
  [
    "Roboto Slab",
    "Zilla Slab",
    "Arvo",
    "Bitter",
    "Crete Round",
    "Slabo",
    "Josefin Slab",
    "Alfa Slab One",
    "Rokkitt",
  ],
  ["slab"],
);

// Monospace
registerKnown(
  [
    "JetBrains Mono",
    "Fira Code",
    "Source Code Pro",
    "IBM Plex Mono",
    "Roboto Mono",
    "Inconsolata",
    "Space Mono",
    "Ubuntu Mono",
    "Cascadia Code",
    "DM Mono",
    "Red Hat Mono",
  ],
  ["code"],
);

// Ligature-capable monospace fonts
const LIGATURE_FONTS = new Set(["Fira Code", "JetBrains Mono"]);

// ── Category defaults ───────────────────────────────────────────────────────

const CATEGORY_DEFAULTS: Record<string, string> = {
  "sans-serif": "sans",
  serif: "serif",
  display: "decorative",
  handwriting: "handwritten",
  monospace: "code",
};

// ── Enrichment logic ────────────────────────────────────────────────────────

function enrichFont(font: FontEntry): string[] {
  const tags = new Set<string>(font.tags);

  // ── Metadata-based rules ────────────────────────────────────────────────

  if (font.variable) {
    tags.add("variable");
  }

  if (font.hasOpticalSizing) {
    tags.add("optical-size");
  }

  // Weight axis range
  const wghtAxis = font.axes.find((a) => a.tag === "wght");
  if (wghtAxis) {
    const range = wghtAxis.max - wghtAxis.min;
    if (range >= 600) {
      tags.add("wide-weight-range");
    }
  }

  // Family name heuristics
  const name = font.family;

  if (/Condensed/i.test(name)) tags.add("condensed");
  if (/Expanded|Wide/i.test(name)) tags.add("expanded");
  if (/Mono/i.test(name)) tags.add("code");
  if (/Display/i.test(name)) tags.add("display");
  if (/Serif/i.test(name) && font.category === "serif") tags.add("serif");
  if (/Slab/i.test(name)) tags.add("slab");
  if (/Script/i.test(name)) tags.add("script");

  // Subset-based rules
  const subsets = new Set(font.subsets);
  if (
    subsets.has("latin-ext") &&
    subsets.has("cyrillic") &&
    subsets.has("greek")
  ) {
    tags.add("multilingual");
  }
  if (font.subsets.length >= 10) {
    tags.add("extensive-language-support");
  }

  // ── Known font mappings ─────────────────────────────────────────────────

  const knownTags = KNOWN_TAGS[name];
  if (knownTags) {
    for (const t of knownTags) tags.add(t);
  }

  // Ligatures for specific fonts
  if (LIGATURE_FONTS.has(name)) {
    tags.add("ligatures");
  }

  // ── Category defaults (for fonts not in any known map) ──────────────────

  if (!knownTags) {
    const defaultTag = CATEGORY_DEFAULTS[font.category];
    if (defaultTag) tags.add(defaultTag);
  }

  // Sort alphabetically and return
  return [...tags].sort();
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log("Loading registry...");
  const raw = readFileSync(REGISTRY_PATH, "utf-8");
  const registry: Registry = JSON.parse(raw);

  const totalFonts = registry.fonts.length;
  let fontsWithExistingTags = 0;
  let fontsEnriched = 0;
  let totalTagsBefore = 0;
  let totalTagsAfter = 0;
  const tagCounts: Record<string, number> = {};

  for (const font of registry.fonts) {
    const before = font.tags.length;
    totalTagsBefore += before;
    if (before > 0) fontsWithExistingTags++;

    font.tags = enrichFont(font);

    const after = font.tags.length;
    totalTagsAfter += after;
    if (after > before) fontsEnriched++;

    for (const t of font.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }

  const fontsWithTagsAfter = registry.fonts.filter(
    (f) => f.tags.length > 0,
  ).length;

  console.log("\nWriting enriched registry...");
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n");

  // ── Stats ─────────────────────────────────────────────────────────────

  console.log("\n=== Enrichment Stats ===");
  console.log(`Total fonts:              ${totalFonts}`);
  console.log(
    `Fonts with tags before:   ${fontsWithExistingTags} (${((fontsWithExistingTags / totalFonts) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Fonts with tags after:    ${fontsWithTagsAfter} (${((fontsWithTagsAfter / totalFonts) * 100).toFixed(1)}%)`,
  );
  console.log(`Fonts enriched (gained):  ${fontsEnriched}`);
  console.log(`Total tags before:        ${totalTagsBefore}`);
  console.log(`Total tags after:         ${totalTagsAfter}`);
  console.log(
    `Tags added:               ${totalTagsAfter - totalTagsBefore}`,
  );

  console.log("\n=== Tag Distribution ===");
  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  for (const [tag, count] of sorted) {
    console.log(`  ${tag.padEnd(30)} ${count}`);
  }

  console.log("\nDone.");
}

main();
