/**
 * Market Service SDK - React Hooks
 *
 * Optional React integration for admin UIs and dashboards.
 * These hooks provide reactive data fetching and SDK status monitoring.
 *
 * Note: React is an optional peer dependency. These hooks will only work
 * if React is installed in the consuming application.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MarketServiceClient } from './MarketServiceClient';
import {
  SDKVersionStatus,
  Market,
  CostAdder,
  CountyData,
  CountyDataFilters,
  PermitHistorySummary,
  FeatureAccessResult,
  MarketServiceError,
} from './types';

// ============================================
// SDK STATUS HOOK
// ============================================

export interface UseSDKStatusResult {
  /** Current version status */
  status: SDKVersionStatus['status'];
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Whether an update is required to continue */
  updateRequired: boolean;
  /** Optional message from the service */
  message?: string;
  /** Latest available version */
  latest?: string;
  /** Current SDK version */
  current: string;
  /** Full status object */
  fullStatus: SDKVersionStatus | null;
}

/**
 * Hook for monitoring SDK version status
 *
 * Use this to display update notifications in admin UIs.
 *
 * @example
 * ```tsx
 * function AdminHeader({ client }: { client: MarketServiceClient }) {
 *   const { updateAvailable, updateRequired, message, latest } = useSDKStatus(client);
 *
 *   if (updateRequired) {
 *     return <Banner type="error">SDK update required to v{latest}. {message}</Banner>;
 *   }
 *
 *   if (updateAvailable) {
 *     return <Banner type="warning">SDK v{latest} available. {message}</Banner>;
 *   }
 *
 *   return null;
 * }
 * ```
 */
export function useSDKStatus(client: MarketServiceClient): UseSDKStatusResult {
  const [status, setStatus] = useState<SDKVersionStatus | null>(
    client.getVersionStatus()
  );

  useEffect(() => {
    // Get initial status
    setStatus(client.getVersionStatus());

    // Subscribe to changes
    const unsubscribe = client.onVersionChange((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, [client]);

  return {
    status: status?.status || 'unknown',
    updateAvailable: status?.updateAvailable || false,
    updateRequired: status?.updateRequired || false,
    message: status?.message,
    latest: status?.latest,
    current: client.getSDKVersion(),
    fullStatus: status,
  };
}

// ============================================
// MARKETS HOOK
// ============================================

export interface UseMarketsFilters {
  brand_id?: number;
  client_id?: number;
  active?: boolean;
}

export interface UseMarketsResult {
  markets: Market[];
  loading: boolean;
  error: MarketServiceError | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching markets with automatic refresh
 *
 * @example
 * ```tsx
 * function MarketList({ client, brandId }: Props) {
 *   const { markets, loading, error, refetch } = useMarkets(client, { brand_id: brandId });
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <ul>
 *       {markets.map(market => (
 *         <li key={market.id}>{market.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useMarkets(
  client: MarketServiceClient,
  filters?: UseMarketsFilters
): UseMarketsResult {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MarketServiceError | null>(null);

  // Stringify filters for dependency comparison
  const filtersKey = JSON.stringify(filters);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await client.getMarkets(filters);
      setMarkets(data);
    } catch (e) {
      setError(e instanceof MarketServiceError ? e : new MarketServiceError(
        (e as Error).message,
        'UNKNOWN_ERROR'
      ));
    } finally {
      setLoading(false);
    }
  }, [client, filtersKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { markets, loading, error, refetch };
}

// ============================================
// SINGLE MARKET HOOK
// ============================================

export interface UseMarketResult {
  market: Market | null;
  costAdders: CostAdder[];
  loading: boolean;
  error: MarketServiceError | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching a single market with its cost adders
 *
 * @example
 * ```tsx
 * function MarketDetail({ client, marketId }: Props) {
 *   const { market, costAdders, loading, error } = useMarket(client, marketId);
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!market) return <NotFound />;
 *
 *   return (
 *     <div>
 *       <h1>{market.name}</h1>
 *       <CostAdderList adders={costAdders} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useMarket(
  client: MarketServiceClient,
  marketId: string | undefined
): UseMarketResult {
  const [market, setMarket] = useState<Market | null>(null);
  const [costAdders, setCostAdders] = useState<CostAdder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MarketServiceError | null>(null);

  const refetch = useCallback(async () => {
    if (!marketId) {
      setMarket(null);
      setCostAdders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [marketData, addersData] = await Promise.all([
        client.getMarketById(marketId),
        client.getCostAdders(marketId),
      ]);
      setMarket(marketData);
      setCostAdders(addersData);
    } catch (e) {
      setError(e instanceof MarketServiceError ? e : new MarketServiceError(
        (e as Error).message,
        'UNKNOWN_ERROR'
      ));
    } finally {
      setLoading(false);
    }
  }, [client, marketId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { market, costAdders, loading, error, refetch };
}

// ============================================
// COUNTIES HOOK
// ============================================

export interface UseCountiesResult {
  counties: CountyData[];
  loading: boolean;
  error: MarketServiceError | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching county data
 *
 * @example
 * ```tsx
 * function CountySelector({ client, stateCode }: Props) {
 *   const { counties, loading, error } = useCounties(client, { state_code: stateCode });
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <select>
 *       {counties.map(county => (
 *         <option key={county.county_fips} value={county.county_fips}>
 *           {county.county_name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useCounties(
  client: MarketServiceClient,
  filters?: CountyDataFilters
): UseCountiesResult {
  const [counties, setCounties] = useState<CountyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MarketServiceError | null>(null);

  const filtersKey = JSON.stringify(filters);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let data: CountyData[];
      if (filters?.state_code) {
        data = await client.getCountiesByState(filters.state_code);
      } else {
        data = await client.getCounties(filters);
      }
      setCounties(data);
    } catch (e) {
      setError(e instanceof MarketServiceError ? e : new MarketServiceError(
        (e as Error).message,
        'UNKNOWN_ERROR'
      ));
    } finally {
      setLoading(false);
    }
  }, [client, filtersKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { counties, loading, error, refetch };
}

// ============================================
// HIGH RISK COUNTIES HOOK
// ============================================

export interface UseHighRiskCountiesResult {
  counties: CountyData[];
  loading: boolean;
  error: MarketServiceError | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching high-risk counties (by hail risk score)
 */
export function useHighRiskCounties(
  client: MarketServiceClient,
  limit: number = 50,
  stateCode?: string
): UseHighRiskCountiesResult {
  const [counties, setCounties] = useState<CountyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MarketServiceError | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await client.getHighRiskCounties(limit, stateCode);
      setCounties(data);
    } catch (e) {
      setError(e instanceof MarketServiceError ? e : new MarketServiceError(
        (e as Error).message,
        'UNKNOWN_ERROR'
      ));
    } finally {
      setLoading(false);
    }
  }, [client, limit, stateCode]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { counties, loading, error, refetch };
}

// ============================================
// PERMIT HISTORY ACCESS HOOK
// ============================================

export interface UsePermitAccessResult {
  access: FeatureAccessResult | null;
  loading: boolean;
  error: MarketServiceError | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for checking permit history feature access
 *
 * @example
 * ```tsx
 * function PermitDataSection({ client, clientId }: Props) {
 *   const { access, loading } = usePermitAccess(client, clientId);
 *
 *   if (loading) return <Spinner />;
 *
 *   if (!access?.has_access) {
 *     return (
 *       <UpgradePrompt message={access?.upgrade_message} />
 *     );
 *   }
 *
 *   return <PermitDataDashboard />;
 * }
 * ```
 */
export function usePermitAccess(
  client: MarketServiceClient,
  clientId: number,
  brandId?: number
): UsePermitAccessResult {
  const [access, setAccess] = useState<FeatureAccessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MarketServiceError | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await client.checkPermitHistoryAccess(clientId, brandId);
      setAccess(result);
    } catch (e) {
      setError(e instanceof MarketServiceError ? e : new MarketServiceError(
        (e as Error).message,
        'UNKNOWN_ERROR'
      ));
    } finally {
      setLoading(false);
    }
  }, [client, clientId, brandId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { access, loading, error, refetch };
}

// ============================================
// PERMIT HISTORY SUMMARY HOOK
// ============================================

export interface UsePermitSummaryResult {
  summaries: PermitHistorySummary[];
  loading: boolean;
  error: MarketServiceError | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching permit history summaries for multiple counties
 */
export function usePermitSummary(
  client: MarketServiceClient,
  countyFipsList: string[],
  clientId: number,
  brandId?: number
): UsePermitSummaryResult {
  const [summaries, setSummaries] = useState<PermitHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MarketServiceError | null>(null);

  const countyKey = JSON.stringify(countyFipsList);

  const refetch = useCallback(async () => {
    if (countyFipsList.length === 0) {
      setSummaries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await client.getPermitHistorySummary(countyFipsList, clientId, brandId);
      setSummaries(data);
    } catch (e) {
      setError(e instanceof MarketServiceError ? e : new MarketServiceError(
        (e as Error).message,
        'UNKNOWN_ERROR'
      ));
    } finally {
      setLoading(false);
    }
  }, [client, countyKey, clientId, brandId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { summaries, loading, error, refetch };
}

// ============================================
// MARKET LOOKUP HOOK
// ============================================

export interface UseMarketLookupResult {
  market: Market | null;
  costAdders: CostAdder[];
  matchedBy: 'county' | 'zip' | 'state' | 'none' | null;
  loading: boolean;
  error: MarketServiceError | null;
  lookup: (params: { zip?: string; countyFips?: string; stateCode?: string }) => Promise<void>;
}

/**
 * Hook for looking up markets by location
 *
 * @example
 * ```tsx
 * function MarketLookup({ client, brandId }: Props) {
 *   const { market, costAdders, matchedBy, loading, lookup } = useMarketLookup(client, brandId);
 *
 *   const handleZipChange = (zip: string) => {
 *     if (zip.length === 5) {
 *       lookup({ zip });
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input onChange={e => handleZipChange(e.target.value)} />
 *       {market && <div>Found: {market.name} (matched by {matchedBy})</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMarketLookup(
  client: MarketServiceClient,
  brandId: number
): UseMarketLookupResult {
  const [market, setMarket] = useState<Market | null>(null);
  const [costAdders, setCostAdders] = useState<CostAdder[]>([]);
  const [matchedBy, setMatchedBy] = useState<'county' | 'zip' | 'state' | 'none' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MarketServiceError | null>(null);

  const lookup = useCallback(async (params: {
    zip?: string;
    countyFips?: string;
    stateCode?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const result = await client.lookupMarket({
        brand_id: brandId,
        zip: params.zip,
        county_fips: params.countyFips,
        state_code: params.stateCode,
      });

      setMarket(result.market);
      setCostAdders(result.cost_adders);
      setMatchedBy(result.matched_by);
    } catch (e) {
      setError(e instanceof MarketServiceError ? e : new MarketServiceError(
        (e as Error).message,
        'UNKNOWN_ERROR'
      ));
      setMarket(null);
      setCostAdders([]);
      setMatchedBy(null);
    } finally {
      setLoading(false);
    }
  }, [client, brandId]);

  return { market, costAdders, matchedBy, loading, error, lookup };
}

// ============================================
// CLIENT SINGLETON HOOK
// ============================================

/**
 * Hook for creating a memoized client instance
 *
 * Prevents unnecessary client recreation on re-renders.
 *
 * @example
 * ```tsx
 * function App() {
 *   const client = useMarketClient({
 *     baseURL: process.env.MARKET_SERVICE_URL,
 *     apiKey: process.env.MARKET_SERVICE_API_KEY,
 *   });
 *
 *   return <MarketProvider client={client}><Dashboard /></MarketProvider>;
 * }
 * ```
 */
export function useMarketClient(config: {
  baseURL: string;
  apiKey: string;
  clientAppName?: string;
  timeout?: number;
}): MarketServiceClient {
  const clientRef = useRef<MarketServiceClient | null>(null);
  const configKey = `${config.baseURL}:${config.apiKey}:${config.clientAppName}`;

  if (!clientRef.current) {
    clientRef.current = new MarketServiceClient(config);
  }

  // Recreate client if config changes (rare, but handle it)
  useEffect(() => {
    clientRef.current = new MarketServiceClient(config);
  }, [configKey]);

  return clientRef.current;
}
