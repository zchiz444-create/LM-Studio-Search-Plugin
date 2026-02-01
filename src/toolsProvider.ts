import { Tool, ToolsProviderController } from '@lmstudio/sdk';
import { createRateLimiter } from './utils/rateLimiter';
import { createWebSearchTool } from './tools/webSearch';
import { createVisitWebsiteTool } from './tools/visitWebsite';

export async function toolsProvider(
  ctl: ToolsProviderController,
): Promise<Tool[]> {
  const rateLimiter = createRateLimiter();

  const webSearchTool = createWebSearchTool({ ctl, rateLimiter });
  const visitWebsiteTool = createVisitWebsiteTool({ ctl });

  return [webSearchTool, visitWebsiteTool];
}
