import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import type { CheerioAPI } from './domParser';
import { removeNonContentElements, extractBodyText } from './domParser';
import type { ReadabilityResult, ContentExtractionOptions } from './types';

export function extractReadableContent(
  html: string,
  url: string,
): ReadabilityResult | null {
  try {
    const { document } = parseHTML(html);

    // Set documentURI for relative URL resolution
    Object.defineProperty(document, 'documentURI', {
      value: url,
      writable: false,
    });

    const reader = new Readability(document, {
      charThreshold: 100,
    });

    const article = reader.parse();

    if (!article) {
      return null;
    }

    return {
      title: article.title || '',
      content: article.content || '',
      textContent: (article.textContent || '').replace(/\s+/g, ' ').trim(),
      excerpt: article.excerpt || '',
      byline: article.byline,
      siteName: article.siteName,
    };
  } catch {
    return null;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAroundSearchTerms(
  text: string,
  searchTerms: string[],
  maxLength: number,
): string {
  if (!searchTerms.length || maxLength >= text.length) {
    return text.slice(0, maxLength);
  }

  const padding = Math.floor(maxLength / (searchTerms.length * 2));
  const matches: Array<{ start: number; end: number; text: string }> = [];

  for (const term of searchTerms) {
    const escapedTerm = escapeRegex(term);
    const regex = new RegExp(escapedTerm, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - padding);
      const end = Math.min(text.length, match.index + match[0].length + padding);
      matches.push({ start, end, text: text.slice(start, end) });
    }
  }

  if (matches.length === 0) {
    return text.slice(0, maxLength);
  }

  // Sort by position and merge overlapping ranges
  matches.sort((a, b) => a.start - b.start);

  const merged: string[] = [];
  let currentStart = matches[0].start;
  let currentEnd = matches[0].end;

  for (let i = 1; i < matches.length; i++) {
    if (matches[i].start <= currentEnd) {
      currentEnd = Math.max(currentEnd, matches[i].end);
    } else {
      merged.push(text.slice(currentStart, currentEnd));
      currentStart = matches[i].start;
      currentEnd = matches[i].end;
    }
  }
  merged.push(text.slice(currentStart, currentEnd));

  const result = merged.join(' ... ');
  return result.length > maxLength ? result.slice(0, maxLength) : result;
}

export function extractTextContent(
  html: string,
  url: string,
  $: CheerioAPI,
  options: ContentExtractionOptions = {},
): string {
  const { maxLength = 10000, searchTerms = [] } = options;

  // Try Readability first for article-like content
  const readable = extractReadableContent(html, url);

  if (readable && readable.textContent.length > 200) {
    return searchTerms.length
      ? extractAroundSearchTerms(readable.textContent, searchTerms, maxLength)
      : readable.textContent.slice(0, maxLength);
  }

  // Fallback: Extract text from body with boilerplate removal
  removeNonContentElements($);
  const text = extractBodyText($);

  return searchTerms.length
    ? extractAroundSearchTerms(text, searchTerms, maxLength)
    : text.slice(0, maxLength);
}
