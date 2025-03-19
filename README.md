# keyv-dataloader

A DataLoader implementation with caching support using [Keyv](https://github.com/jaredwray/keyv).

## Installation

```bash
npm install keyv-dataloader
# or
yarn add keyv-dataloader
# or
pnpm add keyv-dataloader
```

## Usage

```typescript
import { KeyvDataLoader } from 'keyv-dataloader';

// Create a new loader with caching
const loader = new KeyvDataLoader({
  // Function to batch load keys
  batchLoadFn: async (keys) => {
    console.log('Loading keys:', keys);
    return keys.map(key => `Value for ${key}`);
  },
  // Optional: Custom function to generate cache keys
  cacheKeyFn: (key) => `custom-prefix:${key}`,
  // Optional: TTL in milliseconds (how long to keep items in cache)
  ttl: 60 * 1000, // 1 minute
  // Optional: Keyv options (storage adapters, etc.)
  keyvOptions: {
    namespace: 'my-cache'
  },
  // Optional: DataLoader options
  dataLoaderOptions: {
    maxBatchSize: 100,
    cache: true
  }
});

// Load a single value
const value = await loader.load('key1');

// Load multiple values
const values = await loader.loadMany(['key2', 'key3']);

// Clear a value from cache
await loader.clear('key1');

// Clear all cached values
await loader.clearAll();
```

## Features

- **Batching**: Groups individual loads that occur within a single tick of the event loop into a single batch
- **Caching**: Uses Keyv to cache results with optional TTL support
- **Flexible Storage**: Works with any Keyv storage adapter (Redis, MongoDB, SQLite, etc.)
- **TypeScript Support**: Fully typed API

## License

MIT
