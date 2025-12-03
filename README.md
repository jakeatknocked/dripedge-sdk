# DripEdge SDKs

Official TypeScript SDKs for DripEdge services. These packages provide type-safe access to DripEdge APIs for roofing industry applications.

## Available SDKs

| Package | Version | Description |
|---------|---------|-------------|
| [`@dripedge/market-service-sdk`](./market) | 1.1.0 | Market management, cost adders, county data, permit history |

## Installation

All packages are published to GitHub Packages. Configure npm to use the DripEdge registry:

```bash
# Add to your project's .npmrc
@dripedge:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install packages:

```bash
npm install @dripedge/market-service-sdk
```

## Authentication

All SDKs require an **API key** for app-to-app authentication:

```typescript
import { MarketServiceClient } from '@dripedge/market-service-sdk';

const client = new MarketServiceClient({
  baseURL: process.env.MARKET_SERVICE_URL,
  apiKey: process.env.MARKET_SERVICE_API_KEY, // Required
});
```

**To obtain an API key:**
1. Contact DripEdge support
2. Register your application
3. Receive your API key (keep it secret!)

## SDK Features

### Common Features

All DripEdge SDKs include:

- **TypeScript** - Full type definitions
- **API key authentication** - Secure app-to-app auth
- **Version awareness** - Automatic update notifications
- **Error handling** - Typed errors with helper methods
- **React hooks** - Optional React integration (peer dependency)

### Version Awareness

SDKs automatically track compatibility with services:

```typescript
const client = new MarketServiceClient({
  baseURL: '...',
  apiKey: '...',
  onVersionChange: (status) => {
    if (status.updateRequired) {
      console.error('SDK update required!', status.message);
    }
  },
});
```

## Packages

### Market Service SDK

Market management, pricing, and location-based features.

```typescript
import { MarketServiceClient } from '@dripedge/market-service-sdk';

// Look up market by location
const result = await client.findMarketByZip(brandId, '80202');

// Get county economic data
const county = await client.getCountyByFips('08031');

// Check permit history (premium)
const access = await client.checkPermitHistoryAccess(clientId);
```

[Full documentation →](./market/README.md)

## React Integration

All SDKs include optional React hooks:

```tsx
import { useMarkets, useSDKStatus } from '@dripedge/market-service-sdk';

function Dashboard({ client }) {
  const { updateAvailable } = useSDKStatus(client);
  const { markets, loading, error } = useMarkets(client, { brand_id: 1 });

  // ...
}
```

## Development

### Building SDKs

```bash
# Build all SDKs
npm run build --workspaces

# Build specific SDK
cd market && npm run build
```

### Publishing

SDKs are published automatically via GitHub Actions when changes are pushed to `main`.

Manual publish:

```bash
cd market
npm publish
```

## Repository Structure

```
sdk/
├── README.md           # This file
├── market/             # Market Service SDK
│   ├── src/
│   ├── package.json
│   └── README.md
├── [future-sdk]/       # Future SDKs go here
│   ├── src/
│   └── ...
└── .github/
    └── workflows/      # Publishing automation
```

## Versioning

All SDKs follow [Semantic Versioning](https://semver.org/):

- **Major** - Breaking API changes
- **Minor** - New features, backward compatible
- **Patch** - Bug fixes

## Support

- **Issues**: https://github.com/jakeatknocked/dripedge-sdk/issues
- **Email**: support@dripedge.io

## License

ISC - See individual package LICENSE files for details.
