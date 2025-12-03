/**
 * Market Service Client
 * TypeScript SDK for interacting with DripEdge Market Service API
 *
 * Features:
 * - App-to-app API key authentication (required)
 * - Optional JWT for user-level auth
 * - SDK version awareness with auto-detection
 * - County economic data APIs
 * - Permit history APIs (premium)
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import {
  Market,
  CostAdder,
  MarketLookupRequest,
  MarketLookupResponse,
  CreateMarketRequest,
  UpdateMarketRequest,
  CreateCostAdderRequest,
  UpdateCostAdderRequest,
  ApiResponse,
  MarketServiceConfig,
  ServiceableCounty,
  SDKVersionStatus,
  VersionChangeCallback,
  CountyData,
  CountyDataFilters,
  CountyStats,
  PermitHistory,
  PermitHistorySummary,
  StateTrends,
  TopCountyByPermits,
  FeatureAccessResult,
  MarketServiceError,
  ServiceEnvironment,
  SERVICE_URLS,
} from './types';

// SDK version - read from package.json at build time
const SDK_VERSION = '1.1.0';
const SDK_NAME = '@dripedge/market-service-sdk';

/**
 * Resolve the base URL from config
 * Priority: baseURL > environment > default (development)
 */
function resolveBaseURL(config: MarketServiceConfig): string {
  // Custom baseURL takes priority
  if (config.baseURL) {
    return config.baseURL;
  }

  // Use environment-based URL
  const env = config.environment || 'development';
  return SERVICE_URLS[env];
}

/**
 * Detect environment from API key prefix
 */
function detectEnvironmentFromKey(apiKey: string): ServiceEnvironment {
  if (apiKey.startsWith('mk_live_')) {
    return 'production';
  }
  return 'development';
}

/**
 * Warn if API key doesn't match environment
 */
function validateKeyEnvironment(apiKey: string, environment: ServiceEnvironment): void {
  const keyEnv = detectEnvironmentFromKey(apiKey);

  if (environment === 'production' && keyEnv !== 'production') {
    console.warn(
      '[MarketServiceSDK] Warning: Using test API key (mk_test_) in production environment. ' +
      'Use a production key (mk_live_) for production.'
    );
  }

  if (environment !== 'production' && keyEnv === 'production') {
    console.warn(
      '[MarketServiceSDK] Warning: Using production API key (mk_live_) in non-production environment. ' +
      'Consider using a test key (mk_test_) for development/staging.'
    );
  }
}

export class MarketServiceClient {
  private client: AxiosInstance;
  private config: MarketServiceConfig;
  private versionCallbacks: VersionChangeCallback[] = [];

  /** Current SDK version status from the service */
  public versionStatus: SDKVersionStatus | null = null;

  /** The resolved environment this client is connected to */
  public readonly environment: ServiceEnvironment;

  /** The resolved base URL this client is connected to */
  public readonly baseURL: string;

  constructor(config: MarketServiceConfig) {
    // Validate required API key
    if (!config.apiKey) {
      throw new MarketServiceError(
        'API key is required. Obtain one from the DripEdge admin portal.',
        'MISSING_API_KEY'
      );
    }

    this.config = config;

    // Resolve environment and URL
    this.environment = config.environment || detectEnvironmentFromKey(config.apiKey);
    this.baseURL = resolveBaseURL(config);

    // Validate API key matches environment
    validateKeyEnvironment(config.apiKey, this.environment);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        // SDK identification headers
        'X-SDK-Version': SDK_VERSION,
        'X-SDK-Name': SDK_NAME,
        // Environment header (for service-side logging/routing)
        'X-Environment': this.environment,
        // App-to-app authentication (required)
        'X-API-Key': config.apiKey,
        // Client app identification (optional, for analytics)
        ...(config.clientAppName && { 'X-Client-App': config.clientAppName }),
        // User-level authentication (optional)
        ...(config.jwtToken && { 'Authorization': `Bearer ${config.jwtToken}` }),
      },
    });

    // Register version change callback if provided
    if (config.onVersionChange) {
      this.versionCallbacks.push(config.onVersionChange);
    }

    // Response interceptor for version checking and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.parseVersionHeaders(response);
        return response;
      },
      (error: AxiosError) => {
        // Still parse version headers on error responses
        if (error.response) {
          this.parseVersionHeaders(error.response);
        }
        return this.handleError(error);
      }
    );
  }

  /**
   * Parse SDK version status from response headers
   */
  private parseVersionHeaders(response: AxiosResponse): void {
    const status = response.headers['x-sdk-status'];
    const latest = response.headers['x-sdk-latest'];
    const minimum = response.headers['x-sdk-minimum'];
    const message = response.headers['x-sdk-message'];

    if (status || latest || minimum) {
      const newStatus: SDKVersionStatus = {
        current: SDK_VERSION,
        latest: latest || SDK_VERSION,
        minimum: minimum || '1.0.0',
        status: (status as SDKVersionStatus['status']) || 'unknown',
        message: message || undefined,
        updateRequired: status === 'unsupported' || status === 'deprecated',
        updateAvailable: latest ? this.compareVersions(SDK_VERSION, latest) < 0 : false,
        checkedAt: new Date(),
      };

      // Check if status changed
      const statusChanged = !this.versionStatus ||
        this.versionStatus.status !== newStatus.status ||
        this.versionStatus.latest !== newStatus.latest;

      this.versionStatus = newStatus;

      // Notify callbacks if status changed
      if (statusChanged) {
        this.versionCallbacks.forEach(cb => cb(newStatus));
      }
    }
  }

  /**
   * Compare semantic versions
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;
      if (partA < partB) return -1;
      if (partA > partB) return 1;
    }
    return 0;
  }

  /**
   * Handle API errors and convert to MarketServiceError
   */
  private handleError(error: AxiosError): never {
    if (error.response) {
      const data = error.response.data as ApiResponse<unknown>;
      const statusCode = error.response.status;
      const retryAfter = error.response.headers['retry-after']
        ? parseInt(error.response.headers['retry-after'] as string, 10)
        : undefined;

      // Determine error code
      let code = data.errorCode || 'API_ERROR';
      if (statusCode === 401) code = 'INVALID_API_KEY';
      if (statusCode === 403) code = 'INSUFFICIENT_PERMISSIONS';
      if (statusCode === 429) code = 'RATE_LIMITED';

      throw new MarketServiceError(
        data.error || data.message || 'API request failed',
        code,
        statusCode,
        retryAfter
      );
    } else if (error.request) {
      throw new MarketServiceError(
        'No response from Market Service - check network connection',
        'NETWORK_ERROR'
      );
    } else {
      throw new MarketServiceError(
        error.message || 'Unknown error',
        'UNKNOWN_ERROR'
      );
    }
  }

  // ============================================
  // VERSION & STATUS METHODS
  // ============================================

  /**
   * Get current SDK version status
   */
  getVersionStatus(): SDKVersionStatus | null {
    return this.versionStatus;
  }

  /**
   * Get the current SDK version
   */
  getSDKVersion(): string {
    return SDK_VERSION;
  }

  /**
   * Subscribe to version status changes
   */
  onVersionChange(callback: VersionChangeCallback): () => void {
    this.versionCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.versionCallbacks.indexOf(callback);
      if (index > -1) {
        this.versionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update JWT token for user-level authentication
   */
  setJwtToken(token: string): void {
    this.config.jwtToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear JWT token
   */
  clearJwtToken(): void {
    this.config.jwtToken = undefined;
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Update API key (for key rotation)
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.client.defaults.headers.common['X-API-Key'] = apiKey;
  }

  /**
   * Health check - also validates API key
   */
  async healthCheck(): Promise<{
    status: string;
    service: string;
    version: string;
    timestamp: string;
    authenticated: boolean;
  }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // ============================================
  // MARKET OPERATIONS
  // ============================================

  /**
   * Get all markets
   */
  async getMarkets(filters?: {
    client_id?: number;
    brand_id?: number;
    active?: boolean;
  }): Promise<Market[]> {
    const response = await this.client.get<ApiResponse<Market[]>>('/api/markets', {
      params: filters,
    });
    return response.data.data || [];
  }

  /**
   * Get market by UUID
   */
  async getMarketById(id: string): Promise<Market> {
    const response = await this.client.get<ApiResponse<Market>>(`/api/markets/${id}`);
    if (!response.data.data) {
      throw new MarketServiceError('Market not found', 'NOT_FOUND', 404);
    }
    return response.data.data;
  }

  /**
   * Get market by legacy integer ID
   */
  async getMarketByLegacyId(legacyId: number): Promise<Market> {
    const response = await this.client.get<ApiResponse<Market>>(
      `/api/markets/by-legacy-id/${legacyId}`
    );
    if (!response.data.data) {
      throw new MarketServiceError('Market not found', 'NOT_FOUND', 404);
    }
    return response.data.data;
  }

  /**
   * Create new market
   */
  async createMarket(data: CreateMarketRequest): Promise<Market> {
    const response = await this.client.post<ApiResponse<Market>>('/api/markets', data);
    if (!response.data.data) {
      throw new MarketServiceError('Failed to create market', 'CREATE_FAILED');
    }
    return response.data.data;
  }

  /**
   * Update market
   */
  async updateMarket(id: string, data: UpdateMarketRequest): Promise<Market> {
    const response = await this.client.put<ApiResponse<Market>>(`/api/markets/${id}`, data);
    if (!response.data.data) {
      throw new MarketServiceError('Failed to update market', 'UPDATE_FAILED');
    }
    return response.data.data;
  }

  /**
   * Delete market (soft delete)
   */
  async deleteMarket(id: string): Promise<void> {
    await this.client.delete(`/api/markets/${id}`);
  }

  /**
   * Lookup market by location
   */
  async lookupMarket(request: MarketLookupRequest): Promise<MarketLookupResponse> {
    const response = await this.client.post<ApiResponse<MarketLookupResponse>>(
      '/api/markets/lookup',
      request
    );
    if (!response.data.data) {
      throw new MarketServiceError('Failed to lookup market', 'LOOKUP_FAILED');
    }
    return response.data.data;
  }

  /**
   * Get serviceable counties for a market
   */
  async getServiceableCounties(marketId: string): Promise<ServiceableCounty[]> {
    const response = await this.client.get<ApiResponse<ServiceableCounty[]>>(
      `/api/markets/${marketId}/serviceable-counties`
    );
    return response.data.data || [];
  }

  // ============================================
  // COST ADDER OPERATIONS
  // ============================================

  /**
   * Get cost adders for a market
   */
  async getCostAdders(marketId: string): Promise<CostAdder[]> {
    const response = await this.client.get<ApiResponse<CostAdder[]>>(
      `/api/markets/${marketId}/cost-adders`
    );
    return response.data.data || [];
  }

  /**
   * Create cost adder
   */
  async createCostAdder(marketId: string, data: Omit<CreateCostAdderRequest, 'market_id'>): Promise<CostAdder> {
    const response = await this.client.post<ApiResponse<CostAdder>>(
      `/api/markets/${marketId}/cost-adders`,
      data
    );
    if (!response.data.data) {
      throw new MarketServiceError('Failed to create cost adder', 'CREATE_FAILED');
    }
    return response.data.data;
  }

  /**
   * Update cost adder
   */
  async updateCostAdder(costAdderId: string, data: UpdateCostAdderRequest): Promise<CostAdder> {
    const response = await this.client.put<ApiResponse<CostAdder>>(
      `/api/cost-adders/${costAdderId}`,
      data
    );
    if (!response.data.data) {
      throw new MarketServiceError('Failed to update cost adder', 'UPDATE_FAILED');
    }
    return response.data.data;
  }

  /**
   * Delete cost adder (soft delete)
   */
  async deleteCostAdder(costAdderId: string): Promise<void> {
    await this.client.delete(`/api/cost-adders/${costAdderId}`);
  }

  // ============================================
  // COUNTY DATA OPERATIONS
  // ============================================

  /**
   * Get counties with optional filters
   */
  async getCounties(filters?: CountyDataFilters): Promise<CountyData[]> {
    const response = await this.client.get<ApiResponse<CountyData[]>>('/api/counties', {
      params: filters,
    });
    return response.data.data || [];
  }

  /**
   * Get all counties in a state
   */
  async getCountiesByState(stateCode: string): Promise<CountyData[]> {
    const response = await this.client.get<ApiResponse<CountyData[]>>(
      `/api/counties/by-state/${stateCode.toUpperCase()}`
    );
    return response.data.data || [];
  }

  /**
   * Get county by FIPS code
   */
  async getCountyByFips(countyFips: string): Promise<CountyData> {
    const response = await this.client.get<ApiResponse<CountyData>>(
      `/api/counties/${countyFips}`
    );
    if (!response.data.data) {
      throw new MarketServiceError('County not found', 'NOT_FOUND', 404);
    }
    return response.data.data;
  }

  /**
   * Get high-risk counties (by hail risk score)
   */
  async getHighRiskCounties(limit: number = 50, stateCode?: string): Promise<CountyData[]> {
    const response = await this.client.get<ApiResponse<CountyData[]>>('/api/counties/high-risk', {
      params: { limit, state_code: stateCode },
    });
    return response.data.data || [];
  }

  /**
   * Get high-value counties (by average home value)
   */
  async getHighValueCounties(limit: number = 50, stateCode?: string): Promise<CountyData[]> {
    const response = await this.client.get<ApiResponse<CountyData[]>>('/api/counties/high-value', {
      params: { limit, state_code: stateCode },
    });
    return response.data.data || [];
  }

  /**
   * Get aggregated stats for a list of counties
   */
  async getCountyStats(countyFipsList: string[]): Promise<CountyStats> {
    const response = await this.client.post<ApiResponse<CountyStats>>('/api/counties/stats', {
      county_fips_list: countyFipsList,
    });
    if (!response.data.data) {
      throw new MarketServiceError('Failed to get county stats', 'STATS_FAILED');
    }
    return response.data.data;
  }

  // ============================================
  // PERMIT HISTORY OPERATIONS (PREMIUM)
  // ============================================

  /**
   * Check if client has access to permit history feature
   */
  async checkPermitHistoryAccess(clientId: number, brandId?: number): Promise<FeatureAccessResult> {
    const response = await this.client.get<ApiResponse<FeatureAccessResult>>(
      '/api/permits/access',
      { params: { client_id: clientId, brand_id: brandId } }
    );
    return response.data.data || { has_access: false };
  }

  /**
   * Get permit history for a county
   */
  async getPermitHistory(
    countyFips: string,
    clientId: number,
    brandId?: number,
    years: number = 5
  ): Promise<PermitHistory[]> {
    const response = await this.client.get<ApiResponse<PermitHistory[]>>(
      `/api/permits/county/${countyFips}`,
      { params: { client_id: clientId, brand_id: brandId, years } }
    );
    return response.data.data || [];
  }

  /**
   * Get permit history summary for multiple counties
   */
  async getPermitHistorySummary(
    countyFipsList: string[],
    clientId: number,
    brandId?: number
  ): Promise<PermitHistorySummary[]> {
    const response = await this.client.post<ApiResponse<PermitHistorySummary[]>>(
      '/api/permits/summary',
      { county_fips_list: countyFipsList, client_id: clientId, brand_id: brandId }
    );
    return response.data.data || [];
  }

  /**
   * Get top counties by permit volume
   */
  async getTopCountiesByPermits(
    limit: number = 25,
    year?: number,
    stateCode?: string
  ): Promise<TopCountyByPermits[]> {
    const response = await this.client.get<ApiResponse<TopCountyByPermits[]>>(
      '/api/permits/top-counties',
      { params: { limit, year, state_code: stateCode } }
    );
    return response.data.data || [];
  }

  /**
   * Get state-level permit trends
   */
  async getStateTrends(stateCode: string, years: number = 5): Promise<StateTrends> {
    const response = await this.client.get<ApiResponse<StateTrends>>(
      `/api/permits/state/${stateCode.toUpperCase()}`,
      { params: { years } }
    );
    if (!response.data.data) {
      throw new MarketServiceError('State trends not found', 'NOT_FOUND', 404);
    }
    return response.data.data;
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  /**
   * Get markets for a specific brand
   */
  async getMarketsByBrand(brandId: number, activeOnly: boolean = true): Promise<Market[]> {
    return this.getMarkets({ brand_id: brandId, active: activeOnly });
  }

  /**
   * Get markets for a specific client
   */
  async getMarketsByClient(clientId: number, activeOnly: boolean = true): Promise<Market[]> {
    return this.getMarkets({ client_id: clientId, active: activeOnly });
  }

  /**
   * Find market and cost adders by brand and county
   */
  async findMarketByCounty(brandId: number, countyFips: string): Promise<MarketLookupResponse> {
    return this.lookupMarket({ brand_id: brandId, county_fips: countyFips });
  }

  /**
   * Find market and cost adders by brand and state
   */
  async findMarketByState(brandId: number, stateCode: string): Promise<MarketLookupResponse> {
    return this.lookupMarket({ brand_id: brandId, state_code: stateCode });
  }

  /**
   * Find market and cost adders by brand and ZIP code
   */
  async findMarketByZip(brandId: number, zip: string): Promise<MarketLookupResponse> {
    return this.lookupMarket({ brand_id: brandId, zip });
  }

  /**
   * Get active cost adders for a market, optionally filtered by quote type
   */
  async getActiveCostAdders(
    marketId: string,
    options?: { quoteType?: 'retail' | 'lom'; countyFips?: string }
  ): Promise<CostAdder[]> {
    const costAdders = await this.getCostAdders(marketId);

    return costAdders.filter((adder) => {
      // Filter by active status
      if (!adder.active) return false;

      // Filter by quote type
      if (options?.quoteType === 'retail' && !adder.applies_to_retail) return false;
      if (options?.quoteType === 'lom' && !adder.applies_to_lom) return false;

      // Filter by county
      if (options?.countyFips && adder.county_fips && adder.county_fips !== options.countyFips) {
        return false;
      }

      // Filter by effective/expiration dates
      const now = new Date();
      if (adder.effective_date && new Date(adder.effective_date) > now) return false;
      if (adder.expiration_date && new Date(adder.expiration_date) < now) return false;

      return true;
    });
  }

  /**
   * Calculate total cost adders for a quote
   */
  calculateCostAdders(
    costAdders: CostAdder[],
    basePrice: number,
    roofSquares: number
  ): { totalAdderCost: number; breakdown: Array<{ name: string; type: string; cost: number }> } {
    const breakdown: Array<{ name: string; type: string; cost: number }> = [];
    let totalAdderCost = 0;

    for (const adder of costAdders) {
      let cost = 0;

      switch (adder.adder_type) {
        case 'percentage':
          cost = basePrice * (adder.cost_value / 100);
          break;
        case 'fixed':
          cost = adder.cost_value;
          break;
        case 'per_square':
          cost = adder.cost_value * roofSquares;
          break;
      }

      totalAdderCost += cost;
      breakdown.push({
        name: adder.display_name || adder.adder_name,
        type: adder.adder_type,
        cost,
      });
    }

    return { totalAdderCost, breakdown };
  }
}

export default MarketServiceClient;
