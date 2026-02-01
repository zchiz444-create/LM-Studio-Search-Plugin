import { tool, Tool, ToolsProviderController } from '@lmstudio/sdk';
import { z } from 'zod';
import { spoofHeaders } from '../utils/http';
import { resolveConfig, SafeSearchType } from '../utils/configHelpers';
import { RateLimiter } from '../utils/rateLimiter';
import { DDG_HTML_SEARCH_URL } from '../constants';
import { parseDDGResultsAsLinks } from '../utils/parsing';

export interface WebSearchDependencies {
  ctl: ToolsProviderController;
  rateLimiter: RateLimiter;
}

export function createWebSearchTool({
  ctl,
  rateLimiter,
}: WebSearchDependencies): Tool {
  return tool({
    name: 'Web Search',
    description:
      'Search for web pages on DuckDuckGo using a query string and return a list of URLs.',
    parameters: {
      query: z.string().describe('The search query for finding web pages'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe('Number of web results per page'),
      safeSearch: z
        .enum(['strict', 'moderate', 'off'])
        .optional()
        .describe('Safe Search'),
      page: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(1)
        .describe('Page number for pagination'),
    },
    implementation: async (
      { query, pageSize: overridePageSize, safeSearch: overrideSafeSearch, page },
      { status, warn, signal },
    ) => {
      status('Initiating DuckDuckGo web search...');
      await rateLimiter.waitIfNeeded();

      try {
        const config = resolveConfig(ctl, {
          pageSize: overridePageSize,
          safeSearch: overrideSafeSearch as SafeSearchType | undefined,
        });
        const { pageSize, safeSearch } = config;

        const headers = spoofHeaders();
        const url = new URL(DDG_HTML_SEARCH_URL);
        url.searchParams.append('q', query);

        if (safeSearch !== 'moderate') {
          url.searchParams.append('p', safeSearch === 'strict' ? '-1' : '1');
        }

        if (page > 1) {
          url.searchParams.append('s', (pageSize * (page - 1) || 0).toString());
        }

        console.log(
          `Fetching DuckDuckGo search results for query: ${url.toString()}`,
        );

        const response = await fetch(url.toString(), {
          method: 'GET',
          signal,
          headers,
        });

        if (!response.ok) {
          warn(`Failed to fetch search results: ${response.statusText}`);
          return `Error: Failed to fetch search results: ${response.statusText}`;
        }

        const html = await response.text();

        const links = parseDDGResultsAsLinks(html, pageSize);

        if (links.length === 0) {
          return 'No web pages found for the query.';
        }

        status(`Found ${links.length} web pages.`);
        return {
          links,
          count: links.length,
        };
      } catch (error: any) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return 'Search aborted by user.';
        }
        console.error(error);
        warn(`Error during search: ${error.message}`);
        return `Error: ${error.message}`;
      }
    },
  });
}
