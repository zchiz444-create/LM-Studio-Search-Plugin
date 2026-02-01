import type { CheerioAPI } from './domParser';
import type { LinkTuple, ParsedLink } from './types';

interface RawLink {
  index: number;
  label: string;
  url: string;
}

function scoreLinks(
  links: RawLink[],
  searchTerms?: string[],
): Array<RawLink & { score: number }> {
  const total = links.length;

  return links.map(({ index, label, url }) => {
    // Count digits in URL - fewer digits = more likely navigation link
    const digitCount = (url.match(/\d/g) || []).length;
    const ratio = 1 / Math.max(1, digitCount);

    // Position penalty - earlier links score higher
    const positionPenalty = (20 * index) / total;

    // Base score calculation (matches original algorithm)
    let score =
      ratio * (100 - (label.length + url.length + positionPenalty)) +
      (1 - ratio) * label.split(/\s+/).length;

    // Boost for search term matches
    if (searchTerms?.length) {
      for (const term of searchTerms) {
        if (label.toLowerCase().includes(term.toLowerCase())) {
          score += 1000;
        }
      }
    }

    return { index, label, url, score };
  });
}

export function extractLinks(
  $: CheerioAPI,
  baseUrl: string,
  maxLinks: number,
  searchTerms?: string[],
): LinkTuple[] {
  const seen = new Set<string>();
  const links: RawLink[] = [];

  $('a[href]').each((index, element) => {
    const $el = $(element);
    const href = $el.attr('href');
    if (!href) return;

    // Resolve relative URLs
    let url: string;
    try {
      if (href.startsWith('/')) {
        url = new URL(href, baseUrl).href;
      } else if (href.startsWith('http')) {
        url = href;
      } else {
        return; // Skip non-HTTP URLs (javascript:, mailto:, etc.)
      }
    } catch {
      return; // Invalid URL
    }

    // Skip duplicates
    if (seen.has(url)) return;
    seen.add(url);

    // Extract label (handles nested elements like <a><span>text</span></a>)
    const label = $el.text().replace(/\s+/g, ' ').trim();
    if (!label) return;

    links.push({ index, label, url });
  });

  // Score, sort, and limit results
  return scoreLinks(links, searchTerms)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxLinks)
    .map(({ label, url }) => [label, url] as LinkTuple);
}

export function extractLinksWithScores(
  $: CheerioAPI,
  baseUrl: string,
  maxLinks: number,
  searchTerms?: string[],
): ParsedLink[] {
  const seen = new Set<string>();
  const links: RawLink[] = [];

  $('a[href]').each((index, element) => {
    const $el = $(element);
    const href = $el.attr('href');
    if (!href) return;

    let url: string;
    try {
      if (href.startsWith('/')) {
        url = new URL(href, baseUrl).href;
      } else if (href.startsWith('http')) {
        url = href;
      } else {
        return;
      }
    } catch {
      return;
    }

    if (seen.has(url)) return;
    seen.add(url);

    const label = $el.text().replace(/\s+/g, ' ').trim();
    if (!label) return;

    links.push({ index, label, url });
  });

  return scoreLinks(links, searchTerms)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxLinks)
    .map(({ label, url, score }) => ({ label, url, score }));
}
