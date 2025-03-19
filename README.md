# keyv-dataloader

A DataLoader implementation with caching support using [Keyv](https://github.com/jaredwray/keyv). Combines the batching capabilities of Facebook's DataLoader with the flexible caching of Keyv.

## Installation

```bash
# Install the package (recommended)
pnpm add keyv-dataloader
pnpm add dataloader keyv
```

```bash
# Or with npm
npm install keyv-dataloader
npm install dataloader keyv
```

```bash
# Or with yarn
yarn add keyv-dataloader
yarn add dataloader keyv
```

## Usage

```typescript
import { KeyvDataLoader } from 'keyv-dataloader';

// Create a new loader with caching
const loader = new KeyvDataLoader({
  // Function to batch load keys
  batchLoadFn: async (keys) => {
    console.log('Loading keys:', keys);
    return keys.map((key) => `Value for ${key}`);
  },
  // Optional: Custom function to generate cache keys
  cacheKeyFn: (key) => `custom-prefix:${key}`,
  // Optional: TTL in milliseconds (how long to keep items in cache)
  ttl: 60 * 1000, // 1 minute
  // Optional: Keyv options (storage adapters, etc.)
  keyvOptions: {
    namespace: 'my-cache',
  },
  // Optional: DataLoader options
  dataLoaderOptions: {
    maxBatchSize: 100,
    cache: true,
  },
});

// Load a single value (returns a Promise)
const value = await loader.load('key1');

// Load multiple values (returns a Promise)
const values = await loader.loadMany(['key2', 'key3']);

// Prime the cache with a value (returns a Promise that resolves to the instance for chaining)
// If the key already exists, no change is made
await loader.prime('key4', 'Value for key4');

// Prime the cache with an error
await loader.prime('key5', new Error('This is an error'));

// Clear a value from cache (returns a Promise that resolves to the instance for chaining)
await loader.clear('key1');

// Clear all cached values (returns a Promise that resolves to the instance for chaining)
await loader.clearAll();

// Sequential calls for forcefully updating a cached value
await loader.clear('key1');
await loader.prime('key1', 'new value');

// Using Promise chaining
loader.clear('key1')
  .then(loader => loader.prime('key1', 'new value'))
  .then(loader => {
    // Continue using the loader...
  });
```

## API

### `new KeyvDataLoader(options)`

Creates a new `KeyvDataLoader` instance.

#### Options

- `batchLoadFn`: Function to batch load multiple keys
- `cacheKeyFn` (optional): Function to generate cache key from the input key
- `ttl` (optional): TTL in milliseconds for cache entries
- `dataLoaderOptions` (optional): DataLoader options
- `keyvOptions` (optional): Keyv options

### Methods

- **`load(key)`**: Loads a key, returns a Promise for the value
- **`loadMany(keys)`**: Loads multiple keys, returns a Promise for array of values
- **`prime(key, value)`**: Prime the cache with a key-value pair. Returns a Promise that resolves to the instance for method chaining. If the key already exists, no change is made. To forcefully prime the cache, clear the key first with sequential calls: `await loader.clear(key); await loader.prime(key, value);`. To prime the cache with an error, provide an Error instance.
- **`clear(key)`**: Clear a key from cache. Returns a Promise that resolves to the instance for method chaining.
- **`clearAll()`**: Clear all keys from cache. Returns a Promise that resolves to the instance for method chaining.

All methods return Promises. The `clear()`, `clearAll()`, and `prime()` methods resolve to the instance for method chaining, while `load()` and `loadMany()` resolve to the loaded values.

## Features

- **DataLoader Compatible**: Implements the same API as Facebook's DataLoader
- **Batching**: Groups individual loads that occur within a single tick of the event loop into a single batch
- **Efficient Caching**: Uses Keyv's batch methods (getMany, setMany) for optimal performance
- **Redis Storage**: Works with Redis storage adapter via Keyv
- **TypeScript Support**: Fully typed API
- **Method Chaining**: All methods support Promise-based method chaining

## Performance

By leveraging Keyv's batch operations (`getMany`, `setMany`), this implementation reduces the number of I/O operations required when working with multiple keys, resulting in better performance compared to individual operations, especially when using Redis.

## Testing

The package includes a comprehensive test suite covering Redis storage adapter. See the [tests README](./tests/README.md) for detailed instructions on running tests.

```bash
# Run all tests
pnpm test

# Run Redis tests only
pnpm test:redis

# Run all tests with Docker (requires Docker and Docker Compose)
pnpm test:docker

# Run tests with coverage
pnpm test:coverage
```

## Development

This project uses [changesets](https://github.com/changesets/changesets) for version management and publishing.

```bash
# Add a new changeset
pnpm changeset

# Update versions and changelogs
pnpm version

# Publish to npm
pnpm release
```

## License

MIT
