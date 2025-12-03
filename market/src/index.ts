/**
 * Market Service SDK
 * Main export file
 *
 * @packageDocumentation
 */

// Core client
export { MarketServiceClient } from './MarketServiceClient';
export { default } from './MarketServiceClient';

// All types
export * from './types';

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
