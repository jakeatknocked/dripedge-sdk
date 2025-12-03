# @jakeatknocked/market-service-sdk

TypeScript SDK for the DripEdge Market Service API. Provides market management, cost adders, county economic data, and permit history features.

## Features

- **App-to-app authentication** - Secure API key-based authentication (required)
- **SDK version awareness** - Automatic detection of updates and deprecation notices
- **Market operations** - CRUD operations for markets and cost adders
- **County data** - Economic and demographic data for US counties
- **Permit history** - Historical roofing permit data (premium feature)
- **React hooks** - Optional React integration for admin UIs
- **TypeScript** - Full type definitions included

## Installation

### 1. Configure npm for GitHub Packages

Create or update your `.npmrc` file:

```bash
# In your project root
echo "@jakeatknocked:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> .npmrc
```

Or use an environment variable (recommended for CI/CD):

```bash
echo "@jakeatknocked:registry=https://npm.pkg.github.com" >> .npmrc
echo '//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}' >> .npmrc
```

### 2. Install the SDK

```bash
npm install @jakeatknocked/market-service-sdk
```

## Quick Start

```typescript
import { MarketServiceClient } from '@jakeatknocked/market-service-sdk';

// Create client with required API key
const client = new MarketServiceClient({
  baseURL: 'https://market-service.dripedge.io',
  apiKey: 'your-app-api-key', // Required - obtain from DripEdge admin
  clientAppName: 'my-app', // Optional - for analytics
});

// Validate connection
const health = await client.healthCheck();
console.log('Connected:', health.authenticated);

// Look up market by ZIP code
const result = await client.findMarketByZip(brandId, '80202');
console.log('Market:', result.market?.name);
console.log('Cost adders:', result.cost_adders.length);
```

## Authentication

### API Key (Required)

Every consuming application must have an API key. This identifies your app and enforces rate limits.

```typescript
const client = new MarketServiceClient({
  baseURL: process.env.MARKET_SERVICE_URL,
  apiKey: process.env.MARKET_SERVICE_API_KEY, // Required
});
```

**To obtain an API key:**
1. Contact DripEdge support or access the admin portal
2. Register your application
3. Receive your API key (keep it secret!)

### JWT Token (Optional)

For user-specific operations, you can add a JWT token:

```typescript
// Set JWT after user login
client.setJwtToken(userJwtToken);

// Clear JWT on logout
client.clearJwtToken();
```

## SDK Version Awareness

The SDK automatically tracks version compatibility with the service:

```typescript
const client = new MarketServiceClient({
  baseURL: 'https://market-service.dripedge.io',
  apiKey: 'your-api-key',
  onVersionChange: (status) => {
    if (status.updateRequired) {
      console.error('SDK update required!', status.message);
    } else if (status.updateAvailable) {
      console.warn('SDK update available:', status.latest);
    }
  },
});

// Check status anytime
const status = client.getVersionStatus();
console.log('SDK version:', client.getSDKVersion());
console.log('Latest available:', status?.latest);
```

## Market Operations

### Get Markets

```typescript
// All markets
const markets = await client.getMarkets();

// By brand
const brandMarkets = await client.getMarketsByBrand(brandId);

// By client
const clientMarkets = await client.getMarketsByClient(clientId);

// With filters
const activeMarkets = await client.getMarkets({
  brand_id: 1,
  active: true,
});
```

### Market Lookup

```typescript
// By ZIP code
const result = await client.findMarketByZip(brandId, '80202');

// By county FIPS
const result = await client.findMarketByCounty(brandId, '08031');

// By state
const result = await client.findMarketByState(brandId, 'CO');

// Result includes:
// - market: Market | null
// - cost_adders: CostAdder[]
// - matched_by: 'county' | 'zip' | 'state' | 'none'
```

### Cost Adders

```typescript
// Get active cost adders for a quote
const adders = await client.getActiveCostAdders(marketId, {
  quoteType: 'retail', // or 'lom'
  countyFips: '08031',
});

// Calculate totals
const { totalAdderCost, breakdown } = client.calculateCostAdders(
  adders,
  basePrice, // e.g., 15000
  roofSquares // e.g., 35
);
```

## County Data

```typescript
// Get all counties in a state
const counties = await client.getCountiesByState('CO');

// Get county by FIPS code
const county = await client.getCountyByFips('08031');
console.log('Population:', county.population);
console.log('Avg home value:', county.avg_home_value);
console.log('Hail risk score:', county.hail_risk_score);

// Get high-risk counties
const highRisk = await client.getHighRiskCounties(50, 'TX');

// Get high-value counties
const highValue = await client.getHighValueCounties(50);

// Get aggregated stats
const stats = await client.getCountyStats(['08031', '08001', '08005']);
console.log('Total homes:', stats.total_homes);
console.log('Avg hail risk:', stats.avg_hail_risk);
```

## Permit History (Premium)

Permit history is a premium feature. Check access before use:

```typescript
// Check access
const access = await client.checkPermitHistoryAccess(clientId, brandId);

if (!access.has_access) {
  console.log('Upgrade required:', access.upgrade_message);
  return;
}

// Get permit history for a county
const history = await client.getPermitHistory('08031', clientId, brandId, 5);

// Get summary for multiple counties
const summaries = await client.getPermitHistorySummary(
  ['08031', '08001'],
  clientId
);

// Get top counties by permits
const topCounties = await client.getTopCountiesByPermits(25, 2024, 'CO');

// Get state trends
const trends = await client.getStateTrends('CO', 5);
console.log('Trend:', trends.trend); // 'increasing' | 'decreasing' | 'stable'
```

## React Hooks

For React applications, optional hooks are included:

```tsx
import {
  useMarketClient,
  useMarkets,
  useMarket,
  useCounties,
  useSDKStatus,
  useMarketLookup,
} from '@jakeatknocked/market-service-sdk';

function App() {
  // Create memoized client
  const client = useMarketClient({
    baseURL: process.env.NEXT_PUBLIC_MARKET_SERVICE_URL!,
    apiKey: process.env.NEXT_PUBLIC_MARKET_SERVICE_API_KEY!,
  });

  return <MarketDashboard client={client} />;
}

function MarketDashboard({ client }) {
  // SDK version status
  const { updateAvailable, updateRequired, message } = useSDKStatus(client);

  // Fetch markets
  const { markets, loading, error, refetch } = useMarkets(client, {
    brand_id: 1,
    active: true,
  });

  if (updateRequired) {
    return <Alert type="error">SDK update required: {message}</Alert>;
  }

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {updateAvailable && <Banner>SDK update available</Banner>}
      <MarketList markets={markets} />
    </div>
  );
}

function MarketSearch({ client, brandId }) {
  const { market, costAdders, matchedBy, loading, lookup } = useMarketLookup(
    client,
    brandId
  );

  return (
    <div>
      <input
        placeholder="Enter ZIP code"
        onChange={(e) => {
          if (e.target.value.length === 5) {
            lookup({ zip: e.target.value });
          }
        }}
      />
      {market && (
        <div>
          Found: {market.name} (matched by {matchedBy})
        </div>
      )}
    </div>
  );
}
```

### Available Hooks

| Hook | Purpose |
|------|---------|
| `useMarketClient` | Create memoized client instance |
| `useSDKStatus` | Monitor SDK version status |
| `useMarkets` | Fetch markets with filters |
| `useMarket` | Fetch single market with cost adders |
| `useCounties` | Fetch county data |
| `useHighRiskCounties` | Fetch high-risk counties |
| `useMarketLookup` | Look up market by location |
| `usePermitAccess` | Check permit history access |
| `usePermitSummary` | Fetch permit summaries |

## Error Handling

The SDK throws `MarketServiceError` for all errors:

```typescript
import { MarketServiceError } from '@jakeatknocked/market-service-sdk';

try {
  const market = await client.getMarketById('invalid-id');
} catch (error) {
  if (error instanceof MarketServiceError) {
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    console.log('Status:', error.statusCode);

    if (error.isAuthError()) {
      // Handle auth errors (redirect to login, refresh token, etc.)
    }

    if (error.isRateLimitError()) {
      // Wait and retry
      const retryAfter = error.retryAfter || 60;
      await delay(retryAfter * 1000);
    }

    if (error.isRetryable()) {
      // Implement retry logic
    }
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `MISSING_API_KEY` | API key not provided |
| `INVALID_API_KEY` | API key is invalid |
| `EXPIRED_API_KEY` | API key has expired |
| `RATE_LIMITED` | Too many requests |
| `INSUFFICIENT_PERMISSIONS` | API key lacks required permissions |
| `NOT_FOUND` | Resource not found |
| `NETWORK_ERROR` | Network connection failed |

## TypeScript Types

All types are exported:

```typescript
import type {
  Market,
  CostAdder,
  CountyData,
  PermitHistory,
  PermitHistorySummary,
  MarketServiceConfig,
  SDKVersionStatus,
  FeatureAccessResult,
  MarketServiceError,
} from '@jakeatknocked/market-service-sdk';
```

## Environment Variables

Recommended environment variables:

```bash
# Required
MARKET_SERVICE_URL=https://market-service.dripedge.io
MARKET_SERVICE_API_KEY=your-api-key

# For frontend (Next.js)
NEXT_PUBLIC_MARKET_SERVICE_URL=https://market-service.dripedge.io
NEXT_PUBLIC_MARKET_SERVICE_API_KEY=your-api-key
```

## License

ISC - See LICENSE file for details.

## Support

- Issues: https://github.com/jakeatknocked/dripedge-sdk/issues
- Email: support@jakeatknocked.io
