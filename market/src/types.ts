/**
 * Market Service SDK Types
 * Shared types for Market Service API
 */

// ============================================
// SDK VERSION & AUTHENTICATION
// ============================================

/**
 * SDK Version Status - returned from service version headers
 */
export interface SDKVersionStatus {
  /** Current SDK version being used */
  current: string;
  /** Latest available SDK version */
  latest: string;
  /** Minimum required SDK version */
  minimum: string;
  /** Status of the current SDK version */
  status: 'current' | 'outdated' | 'deprecated' | 'unsupported' | 'unknown';
  /** Optional message from the service about the SDK version */
  message?: string;
  /** Whether an update is required to continue using the service */
  updateRequired: boolean;
  /** Whether an update is available (but not required) */
  updateAvailable: boolean;
  /** When this status was last checked */
  checkedAt: Date;
}

/**
 * Version change callback type
 */
export type VersionChangeCallback = (status: SDKVersionStatus) => void;

/**
 * Environment type for SDK configuration
 */
export type ServiceEnvironment = 'development' | 'staging' | 'production';

/**
 * Default service URLs by environment
 * These can be overridden by providing a custom baseURL
 */
export const SERVICE_URLS: Record<ServiceEnvironment, string> = {
  development: 'http://localhost:3002',
  staging: 'https://market-service-staging.dripedge.io',
  production: 'https://market-service.dripedge.io',
};

/**
 * SDK Configuration - required for initializing the client
 */
export interface MarketServiceConfig {
  /**
   * Environment to connect to.
   * If provided, the SDK will use the default URL for that environment.
   * Can be overridden by providing a custom baseURL.
   *
   * @example
   * // Use environment (recommended)
   * { environment: 'production', apiKey: 'mk_live_...' }
   *
   * // Or auto-detect from NODE_ENV
   * { environment: process.env.NODE_ENV as ServiceEnvironment, apiKey: '...' }
   */
  environment?: ServiceEnvironment;

  /**
   * Custom base URL of the Market Service API.
   * If provided, this overrides the environment-based URL.
   *
   * @example
   * // Custom URL (for local development or custom deployments)
   * { baseURL: 'http://localhost:3002', apiKey: '...' }
   */
  baseURL?: string;

  /**
   * App-to-app API key for authentication (REQUIRED)
   * This key identifies your application and should be kept secret.
   * Obtain from DripEdge admin portal or contact support.
   *
   * Key format:
   * - Production: mk_live_... (use with environment: 'production')
   * - Development/Staging: mk_test_... (use with environment: 'development' or 'staging')
   */
  apiKey: string;

  /**
   * Optional JWT token for user-level authentication
   * Used when making requests on behalf of a specific user
   */
  jwtToken?: string;

  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;

  /**
   * Optional client identifier for logging/analytics
   * e.g., 'prq-roof-cpq', 'dripedge-admin'
   */
  clientAppName?: string;

  /**
   * Callback invoked when SDK version status changes
   */
  onVersionChange?: VersionChangeCallback;
}

/**
 * API Response wrapper - all responses from the service follow this format
 */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  count?: number;
  message?: string;
  error?: string;
  /** Error code for programmatic error handling */
  errorCode?: string;
}

/**
 * Authentication error types
 */
export type AuthErrorCode =
  | 'INVALID_API_KEY'
  | 'EXPIRED_API_KEY'
  | 'MISSING_API_KEY'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'INVALID_JWT'
  | 'EXPIRED_JWT';

/**
 * Authentication error response
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  retryAfter?: number; // For rate limiting, seconds until retry allowed
}

// ============================================
// MARKET TYPES
// ============================================

export interface Market {
  id: string; // UUID
  legacy_id?: number;
  name: string;
  description?: string;
  state_code?: string;
  market_type: 'state' | 'metro' | 'custom';
  brand_id: number;
  client_id: number;
  parent_market_id?: string;
  serviceable_counties?: ServiceableCounty[];
  active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ServiceableCounty {
  county_fips: string;
  county_name: string;
  state_code: string;
}

export interface CostAdder {
  id: string; // UUID
  market_id: string;
  adder_name: string;
  adder_type: 'percentage' | 'fixed' | 'per_square';
  cost_value: number;
  applies_to_retail: boolean;
  applies_to_lom: boolean;
  county_fips?: string;
  display_on_proposal: boolean;
  display_name?: string;
  effective_date?: Date | string;
  expiration_date?: Date | string;
  active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface MarketLookupRequest {
  brand_id: number;
  zip?: string;
  county_fips?: string;
  state_code?: string;
}

export interface MarketLookupResponse {
  market: Market | null;
  cost_adders: CostAdder[];
  matched_by: 'county' | 'zip' | 'state' | 'none';
}

export interface CreateMarketRequest {
  name: string;
  description?: string;
  state_code?: string;
  market_type: 'state' | 'metro' | 'custom';
  brand_id: number;
  client_id: number;
  parent_market_id?: string;
  serviceable_counties?: ServiceableCounty[];
}

export interface UpdateMarketRequest {
  name?: string;
  description?: string;
  state_code?: string;
  market_type?: 'state' | 'metro' | 'custom';
  parent_market_id?: string;
  serviceable_counties?: ServiceableCounty[];
  active?: boolean;
}

export interface CreateCostAdderRequest {
  market_id: string;
  adder_name: string;
  adder_type: 'percentage' | 'fixed' | 'per_square';
  cost_value: number;
  applies_to_retail?: boolean;
  applies_to_lom?: boolean;
  county_fips?: string;
  display_on_proposal?: boolean;
  display_name?: string;
  effective_date?: Date | string;
  expiration_date?: Date | string;
}

export interface UpdateCostAdderRequest {
  adder_name?: string;
  adder_type?: 'percentage' | 'fixed' | 'per_square';
  cost_value?: number;
  applies_to_retail?: boolean;
  applies_to_lom?: boolean;
  county_fips?: string;
  display_on_proposal?: boolean;
  display_name?: string;
  effective_date?: Date | string;
  expiration_date?: Date | string;
  active?: boolean;
}

// ============================================
// COUNTY ECONOMIC DATA
// ============================================

/**
 * County economic and demographic data
 */
export interface CountyData {
  county_fips: string;
  county_name: string;
  state_code: string;
  /** Total residential homes in the county */
  total_homes?: number;
  /** Total businesses in the county */
  total_businesses?: number;
  /** Average home value in USD */
  avg_home_value?: number;
  /** Median home value in USD */
  median_home_value?: number;
  /** Total population */
  population?: number;
  /** Number of households */
  households?: number;
  /** Median household income in USD */
  median_household_income?: number;
  /** Hail risk score (0-100, higher = more risk) */
  hail_risk_score?: number;
  /** Number of storm events in the last year */
  storm_events_last_year?: number;
  /** Number of storm events in the last 5 years */
  storm_events_last_5_years?: number;
  /** Estimated annual roof replacements based on market data */
  estimated_annual_roof_replacements?: number;
  /** Sources for the data (e.g., { "census": "2022", "storm": "NOAA" }) */
  data_sources?: Record<string, string>;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Filters for querying county data
 */
export interface CountyDataFilters {
  state_code?: string;
  min_population?: number;
  max_population?: number;
  min_hail_risk?: number;
  max_hail_risk?: number;
  min_home_value?: number;
  max_home_value?: number;
  has_storm_data?: boolean;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Aggregated stats for a set of counties
 */
export interface CountyStats {
  total_counties: number;
  total_homes: number;
  total_population: number;
  avg_home_value: number;
  avg_hail_risk: number;
  total_estimated_replacements: number;
}

// ============================================
// PERMIT HISTORY (PREMIUM FEATURE)
// ============================================

/**
 * Historical permit data for a county/year
 */
export interface PermitHistory {
  county_fips: string;
  year: number;
  /** Total roofing permits issued */
  roofing_permits?: number;
  /** Residential roofing permits */
  residential_roofing_permits?: number;
  /** Commercial roofing permits */
  commercial_roofing_permits?: number;
  /** Total value of permits in USD */
  total_permit_value?: number;
  /** Year-over-year change percentage */
  yoy_change_pct?: number;
  /** Data quality indicator */
  data_quality: 'verified' | 'estimated' | 'partial';
}

/**
 * Summarized permit history for a county
 */
export interface PermitHistorySummary {
  county_fips: string;
  county_name: string;
  state_code: string;
  /** Yearly breakdown */
  years: Array<{
    year: number;
    roofing_permits: number;
    yoy_change_pct?: number;
  }>;
  /** Total permits across all years */
  total_roofing_permits: number;
  /** Average annual permits */
  avg_annual_permits: number;
  /** Overall trend direction */
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * State-level permit trends
 */
export interface StateTrends {
  state_code: string;
  state_name: string;
  years: Array<{
    year: number;
    total_permits: number;
    yoy_change_pct?: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  avg_annual_permits: number;
}

/**
 * Top county by permits
 */
export interface TopCountyByPermits {
  county_fips: string;
  county_name: string;
  state_code: string;
  roofing_permits: number;
  year: number;
}

// ============================================
// FEATURE ACCESS / PREMIUM FEATURES
// ============================================

/**
 * Result of checking feature access
 */
export interface FeatureAccessResult {
  /** Whether the client has access to the feature */
  has_access: boolean;
  /** Level of access granted */
  access_level?: 'full' | 'limited' | 'trial';
  /** For rate-limited features, remaining API calls */
  remaining_calls?: number;
  /** For permit history, how many years of data are accessible */
  historical_years_limit?: number;
  /** For trial access, days remaining */
  trial_days_remaining?: number;
  /** Message about upgrading if limited */
  upgrade_message?: string;
}

/**
 * Premium feature identifiers
 */
export type PremiumFeature =
  | 'permit_history'
  | 'storm_data'
  | 'market_intelligence'
  | 'competitor_analysis';

// ============================================
// ERROR TYPES
// ============================================

/**
 * SDK-specific error class
 */
export class MarketServiceError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly retryAfter?: number;

  constructor(message: string, code: string, statusCode?: number, retryAfter?: number) {
    super(message);
    this.name = 'MarketServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }

  /** Check if this is an authentication error */
  isAuthError(): boolean {
    return [
      'INVALID_API_KEY',
      'EXPIRED_API_KEY',
      'MISSING_API_KEY',
      'INVALID_JWT',
      'EXPIRED_JWT',
      'INSUFFICIENT_PERMISSIONS'
    ].includes(this.code);
  }

  /** Check if this is a rate limit error */
  isRateLimitError(): boolean {
    return this.code === 'RATE_LIMITED';
  }

  /** Check if the request can be retried */
  isRetryable(): boolean {
    return this.isRateLimitError() || this.statusCode === 503 || this.statusCode === 504;
  }
}
