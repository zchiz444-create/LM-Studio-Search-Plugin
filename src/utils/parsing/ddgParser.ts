import * as cheerio from 'cheerio';
import type { DDGSearchResult, LinkTuple } from './types';

function extractDDGUrl(href: string): string | null {
  try {
    // DDG encodes URLs in uddg parameter: //duckduckgo.com/l/?uddg=<encoded_url>&...
    if (href.includes('uddg=')) {
      const url = new URL(href, 'https://duckduckgo.com');
      const uddg = url.searchParams.get('uddg');
      return uddg ? decodeURIComponent(uddg) : null;
    }

    // Direct HTTPS URL
    if (href.startsWith('https://') || href.startsWith('http://')) {
      return href;
    }

    return null;
  } catch {
    return null;
  }
}

export function parseDDGResults(html: string): DDGSearchResult[] {
  const $ = cheerio.load(html);
  const results: DDGSearchResult[] = [];
  const seen = new Set<string>();

  // Strategy 1: Look for result containers with links
  // DuckDuckGo HTML uses various selectors depending on the page type
  const selectors = [
    '.result .result__a', // Standard HTML results
    '.result__title a', // Alternative title link
    '.web-result a.result__a', // Web results
    '.results a.result__a', // Results container
    'a.result__url', // URL display links
  ];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');
      if (!href) return;

      const url = extractDDGUrl(href);
      if (!url || seen.has(url)) return;

      // Skip DDG internal links
      if (url.includes('duckduckgo.com')) return;

      seen.add(url);

      const title = $el.text().replace(/\s+/g, ' ').trim();
      if (!title) return;

      // Try to find snippet in parent container
      const $parent = $el.closest('.result, .web-result');
      const snippet =
        $parent.find('.result__snippet').text().replace(/\s+/g, ' ').trim() ||
        undefined;

      results.push({ title, url, snippet });
    });

    if (results.length > 0) break;
  }

  // Fallback: Extract all external links if no results found with selectors
  if (results.length === 0) {
    $('a[href]').each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');
      if (!href) return;

      const url = extractDDGUrl(href);
      if (!url || seen.has(url)) return;

      // Skip DDG internal links and non-content URLs
      if (url.includes('duckduckgo.com')) return;
      if (url.includes('javascript:')) return;
      if (url.startsWith('#')) return;

      seen.add(url);

      const title = $el.text().replace(/\s+/g, ' ').trim();
      if (!title || title.length < 3) return;

      results.push({ title, url });
    });
  }

  return results;
}

export function parseDDGResultsAsLinks(
  html: string,
  maxResults: number,
): LinkTuple[] {
  return parseDDGResults(html)
    .slice(0, maxResults)
    .map(({ title, url }) => [title, url] as LinkTuple);
}
