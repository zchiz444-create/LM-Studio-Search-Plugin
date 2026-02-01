import * as cheerio from 'cheerio';
import type { HeadingsResult } from './types';

export type CheerioAPI = cheerio.CheerioAPI;

export function loadDocument(html: string): CheerioAPI {
  return cheerio.load(html);
}

export function extractTitle($: CheerioAPI): string {
  return $('title').first().text().trim();
}

export function extractHeadings($: CheerioAPI): HeadingsResult {
  return {
    h1: $('h1')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean),
    h2: $('h2')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean),
    h3: $('h3')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean),
  };
}

export function removeNonContentElements($: CheerioAPI): void {
  // Remove elements that don't contain useful content
  $('script, style, noscript, iframe, svg, canvas, template').remove();

  // Remove common navigation/boilerplate elements
  $('header, footer, nav, aside').remove();

  // Remove by ARIA roles
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  $('[role="complementary"], [role="menu"], [role="menubar"]').remove();

  // Remove by common class patterns
  $(
    [
      '[class*="sidebar"]',
      '[class*="menu"]',
      '[class*="nav-"]',
      '[class*="-nav"]',
      '[class*="footer"]',
      '[class*="header"]',
      '[class*="advertisement"]',
      '[class*="social"]',
      '[class*="share"]',
      '[class*="comment"]',
      '[class*="related"]',
      '[class*="breadcrumb"]',
    ].join(', '),
  ).remove();

  // Remove by common ID patterns
  $(
    [
      '[id*="sidebar"]',
      '[id*="menu"]',
      '[id*="nav"]',
      '[id*="footer"]',
      '[id*="header"]',
      '[id*="advertisement"]',
      '[id*="comments"]',
    ].join(', '),
  ).remove();
}

export function extractBodyText($: CheerioAPI): string {
  return $('body').text().replace(/\s+/g, ' ').trim();
}
