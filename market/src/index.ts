/**
 * Market Service SDK
 * Main export file
 *
 * @packageDocumentation
 */

import { MarketServiceClient } from './MarketServiceClient';
import { MarketServiceConfig, ServiceEnvironment, SERVICE_URLS } from './types';

// Core client
export { MarketServiceClient } from './MarketServiceClient';
export { default } from './MarketServiceClient';

// All types
export * from './types';

/**
 * Create a Market Service client with environment-aware configuration.
 *
 * @example
 * // Auto-detect environment from API key
 * const client = createMarketClient({
 *   apiKey: process.env.MARKET_API_KEY!,
 *   clientAppName: 'my-app',
 * });
 *
 * @example
 * // Explicit environment
 * const client = createMarketClient({
 *   environment: 'production',
 *   apiKey: 'mk_live_...',
 *   clientAppName: 'my-app',
 * });
 *
 * @example
 * // Use NODE_ENV
 * const client = createMarketClient({
 *   environment: (process.env.NODE_ENV === 'production' ? 'production' : 'development') as ServiceEnvironment,
 *   apiKey: process.env.MARKET_API_KEY!,
 *   clientAppName: 'my-app',
 * });
 */
export function createMarketClient(config: MarketServiceConfig): MarketServiceClient {
  return new MarketServiceClient(config);
}

/**
 * Get the default service URL for an environment
 *
 * @example
 * const url = getServiceURL('production');
 * // => 'https://market-service.dripedge.io'
 */
export function getServiceURL(environment: ServiceEnvironment): string {
  return SERVICE_URLS[environment];
}

// React hooks (tree-shakeable, optional peer dependency)
export {
  useSDKStatus,
  useMarkets,
  useMarket,
  useCounties,
  useHighRiskCounties,
  usePermitAccess,
  usePermitSummary,
  useMarketLookup,
  useMarketClient,
} from './react';

// Re-export hook result types for consumers
export type {
  UseSDKStatusResult,
  UseMarketsResult,
  UseMarketsFilters,
  UseMarketResult,
  UseCountiesResult,
  UseHighRiskCountiesResult,
  UsePermitAccessResult,
  UsePermitSummaryResult,
  UseMarketLookupResult,
} from './react';
