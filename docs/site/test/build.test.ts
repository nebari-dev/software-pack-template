import { test, expect, beforeAll, setDefaultTimeout } from 'bun:test';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

setDefaultTimeout(180_000);

const SITE = join(import.meta.dir, '..');
const DIST = join(SITE, 'dist');
const BASE = '/building-a-software-pack'; // production base (URL prefix), no trailing slash

const TITLES: Record<string, string> = {
  '': 'Building a Software Pack',
  'what-is-a-software-pack': 'What is a software pack',
  concepts: 'Concepts',
  'build-your-own': 'Build your own pack',
  'nebariapp-crd-reference': 'NebariApp CRD Reference',
  'auth-flow': 'Authentication Flow',
  'release-readiness': 'Release Readiness',
};

// Astro emits files at dist/ root (base only prefixes URLs, it does not nest output).
function pagePath(slug: string): string {
  return slug === '' ? join(DIST, 'index.html') : join(DIST, slug, 'index.html');
}
function readPage(slug: string): string {
  return readFileSync(pagePath(slug), 'utf8');
}
function allHtmlFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) out.push(p);
    }
  };
  walk(DIST);
  return out;
}
function allCss(): string {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.css')) out.push(readFileSync(p, 'utf8'));
    }
  };
  walk(DIST);
  return out.join('\n');
}

beforeAll(async () => {
  await $`bun run build`.cwd(SITE);
});

// Journey 1
test('all 7 pages render at dist root with titles and base-prefixed links', () => {
  for (const [slug, title] of Object.entries(TITLES)) {
    expect(existsSync(pagePath(slug))).toBe(true);
    expect(readPage(slug)).toContain(title);
  }
  // Nav links carry the production base prefix (Starlight prepends base to nav).
  expect(readPage('')).toContain(`href="${BASE}/`);
});

// Journey 2
test('sidebar has both groups with Concepts in the Getting Started slot', () => {
  const html = readPage('what-is-a-software-pack');
  expect(html).toContain('Getting Started');
  expect(html).toContain('Reference');
  // All seven sidebar hrefs resolve to a built page.
  const links = [
    '', 'what-is-a-software-pack', 'concepts', 'build-your-own',
    'nebariapp-crd-reference', 'auth-flow', 'release-readiness',
  ];
  for (const slug of links) {
    const href = slug === '' ? `${BASE}/` : `${BASE}/${slug}/`;
    expect(html).toContain(`href="${href}"`);
    expect(existsSync(pagePath(slug))).toBe(true);
  }
  // Order within Getting Started: What is a software pack -> Concepts -> Build your own.
  const idxWhat = html.indexOf(`href="${BASE}/what-is-a-software-pack/"`);
  const idxConcepts = html.indexOf(`href="${BASE}/concepts/"`);
  const idxBuild = html.indexOf(`href="${BASE}/build-your-own/"`);
  expect(idxConcepts).toBeGreaterThan(idxWhat);
  expect(idxBuild).toBeGreaterThan(idxConcepts);
});
