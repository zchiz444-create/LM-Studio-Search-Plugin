export type LinkTuple = [label: string, url: string];

export interface ParsedLink {
  label: string;
  url: string;
  score?: number;
}

export interface HeadingsResult {
  h1: string[];
  h2: string[];
  h3: string[];
}

export interface DDGSearchResult {
  title: string;
  url: string;
  snippet?: string;
}

export interface ContentExtractionOptions {
  maxLength?: number;
  searchTerms?: string[];
  includeLinks?: boolean;
  maxLinks?: number;
}

export interface ReadabilityResult {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  byline: string | null;
  siteName: string | null;
}

export interface ParsedDocument {
  title: string;
  headings: HeadingsResult;
  links: LinkTuple[];
  mainContent: string;
  rawText: string;
}
