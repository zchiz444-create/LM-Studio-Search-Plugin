import { ToolsProviderController } from '@lmstudio/sdk';
import { configSchematics } from '../config';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_MAX_LINKS,
  DEFAULT_CONTENT_LIMIT,
  DEFAULT_SAFE_SEARCH,
} from '../constants';

export const undefinedIfAuto = <T>(value: T, autoValue: T): T | undefined =>
  value === autoValue ? undefined : value;

export type SafeSearchType = 'strict' | 'moderate' | 'off';

export interface ResolvedConfig {
  pageSize: number;
  safeSearch: SafeSearchType;
  maxLinks: number;
  contentLimit: number;
}

export function resolveConfig(
  ctl: ToolsProviderController,
  overrides: Partial<ResolvedConfig> = {},
): ResolvedConfig {
  const pluginConfig = ctl.getPluginConfig(configSchematics);

  return {
    pageSize:
      undefinedIfAuto(pluginConfig.get('pageSize'), 0) ??
      overrides.pageSize ??
      DEFAULT_PAGE_SIZE,
    safeSearch:
      (undefinedIfAuto(pluginConfig.get('safeSearch'), 'auto') as
        | SafeSearchType
        | undefined) ??
      overrides.safeSearch ??
      DEFAULT_SAFE_SEARCH,
    maxLinks:
      undefinedIfAuto(pluginConfig.get('maxLinks'), -1) ??
      overrides.maxLinks ??
      DEFAULT_MAX_LINKS,
    contentLimit:
      undefinedIfAuto(pluginConfig.get('contentLimit'), -1) ??
      overrides.contentLimit ??
      DEFAULT_CONTENT_LIMIT,
  };
}
