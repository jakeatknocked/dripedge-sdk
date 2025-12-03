# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-03

### Added

- **Required API key authentication** - All SDK instances now require an API key for app-to-app authentication
- **SDK version awareness** - Automatic version status tracking from response headers
  - Parses `X-SDK-Status`, `X-SDK-Latest`, `X-SDK-Minimum`, `X-SDK-Message` headers
  - `getVersionStatus()` method to check current status
  - `onVersionChange(callback)` for reactive version notifications
  - `onVersionChange` config option for initial setup
- **County economic data APIs**
  - `getCounties(filters)` - Get counties with optional filters
  - `getCountiesByState(stateCode)` - Get all counties in a state
  - `getCountyByFips(fips)` - Get single county by FIPS code
  - `getHighRiskCounties(limit, stateCode)` - Counties by hail risk score
  - `getHighValueCounties(limit, stateCode)` - Counties by average home value
  - `getCountyStats(fipsList)` - Aggregated stats for multiple counties
- **Permit history APIs (premium feature)**
  - `checkPermitHistoryAccess(clientId, brandId)` - Check feature access
  - `getPermitHistory(fips, clientId, brandId, years)` - Historical permits
  - `getPermitHistorySummary(fipsList, clientId, brandId)` - Multi-county summaries
  - `getTopCountiesByPermits(limit, year, stateCode)` - Top permit counties
  - `getStateTrends(stateCode, years)` - State-level trends
- **React hooks** for admin UI integration
  - `useMarketClient` - Create memoized client instance
  - `useSDKStatus` - Monitor SDK version status
  - `useMarkets` - Fetch markets with filters
  - `useMarket` - Fetch single market with cost adders
  - `useCounties` - Fetch county data
  - `useHighRiskCounties` - Fetch high-risk counties
  - `useMarketLookup` - Look up market by location
  - `usePermitAccess` - Check permit history access
  - `usePermitSummary` - Fetch permit summaries
- **MarketServiceError class** with helper methods
  - `isAuthError()` - Check if error is authentication-related
  - `isRateLimitError()` - Check if error is rate limiting
  - `isRetryable()` - Check if request can be retried
- **New types**
  - `SDKVersionStatus` - Version status information
  - `CountyData` - County economic/demographic data
  - `CountyDataFilters` - Filters for county queries
  - `CountyStats` - Aggregated county statistics
  - `PermitHistory` - Historical permit data
  - `PermitHistorySummary` - Summarized permit data
  - `StateTrends` - State-level permit trends
  - `TopCountyByPermits` - Top county result type
  - `FeatureAccessResult` - Premium feature access check
  - `AuthErrorCode` - Authentication error codes
- **GitHub Packages publishing** configuration
- **GitHub Actions workflow** for automated publishing

### Changed

- **API key is now required** - Constructor throws if `apiKey` is not provided
- All requests now include `X-SDK-Version` and `X-SDK-Name` headers
- Response headers are parsed for version status updates
- Errors now throw `MarketServiceError` instead of generic `Error`
- `setApiKey()` method for API key rotation support
- Added `clearJwtToken()` method

### Security

- Enforced app-to-app API key authentication
- API key validation on client instantiation
- Rate limiting error support with `retryAfter` handling

## [1.0.0] - 2024-12-02

### Added

- Initial release
- Market CRUD operations
  - `getMarkets(filters)`
  - `getMarketById(id)`
  - `getMarketByLegacyId(legacyId)`
  - `createMarket(data)`
  - `updateMarket(id, data)`
  - `deleteMarket(id)`
- Market lookup by location
  - `lookupMarket(request)`
  - `findMarketByCounty(brandId, fips)`
  - `findMarketByState(brandId, stateCode)`
  - `findMarketByZip(brandId, zip)`
- Cost adder management
  - `getCostAdders(marketId)`
  - `createCostAdder(marketId, data)`
  - `updateCostAdder(id, data)`
  - `deleteCostAdder(id)`
  - `getActiveCostAdders(marketId, options)`
  - `calculateCostAdders(adders, basePrice, squares)`
- Serviceable counties
  - `getServiceableCounties(marketId)`
- Convenience methods
  - `getMarketsByBrand(brandId, activeOnly)`
  - `getMarketsByClient(clientId, activeOnly)`
- JWT token support via `setJwtToken(token)`
- Health check endpoint
- Full TypeScript type definitions
