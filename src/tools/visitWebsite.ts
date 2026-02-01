import { tool, Tool, ToolsProviderController } from '@lmstudio/sdk';
import { z } from 'zod';
import { fetchHTML } from '../utils/http';
import {
  loadDocument,
  extractTitle,
  extractHeadings,
  extractLinks,
  extractTextContent,
} from '../utils/parsing';
import { resolveConfig } from '../utils/configHelpers';

export interface VisitWebsiteDependencies {
  ctl: ToolsProviderController;
}

export interface VisitWebsiteResult {
  url: string;
  title: string;
  h1: string[];
  h2: string[];
  h3: string[];
  links?: [string, string][];
  content?: string;
}

export function createVisitWebsiteTool({
  ctl,
}: VisitWebsiteDependencies): Tool {
  return tool({
    name: 'Visit Website',
    description:
      'Visit a website and return its title, headings, links, and text content.',
    parameters: {
      url: z.string().url().describe('The URL of the website to visit'),
      findInPage: z
        .array(z.string())
        .optional()
        .describe(
          'Highly recommended! Optional search terms to prioritize which links and content to return.',
        ),
      maxLinks: z
        .number()
        .int()
        .min(0)
        .max(200)
        .optional()
        .describe('Maximum number of links to extract from the page.'),
      contentLimit: z
        .number()
        .int()
        .min(0)
        .max(10_000)
        .optional()
        .describe('Maximum text content length to extract from the page.'),
    },
    implementation: async (
      {
        url,
        maxLinks: overrideMaxLinks,
        contentLimit: overrideContentLimit,
        findInPage: searchTerms,
      },
      context,
    ) => {
      const { status, warn, signal } = context;
      status('Visiting website...');

      try {
        const config = resolveConfig(ctl, {
          maxLinks: overrideMaxLinks,
          contentLimit: overrideContentLimit,
        });
        const { maxLinks, contentLimit } = config;

        const { html } = await fetchHTML(url, signal, warn);
        status('Website visited successfully.');

        const $ = loadDocument(html);
        const title = extractTitle($);
        const headings = extractHeadings($);

        const links =
          maxLinks > 0 ? extractLinks($, url, maxLinks, searchTerms) : undefined;

        const content =
          contentLimit > 0
            ? extractTextContent(html, url, $, { maxLength: contentLimit, searchTerms })
            : undefined;

        const result: VisitWebsiteResult = {
          url,
          title,
          ...headings,
          ...(links ? { links } : {}),
          ...(content ? { content } : {}),
        };

        return result;
      } catch (error: any) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return 'Website visit aborted by user.';
        }
        console.error(error);
        warn(`Error during website visit: ${error.message}`);
        return `Error: ${error.message}`;
      }
    },
  });
}
