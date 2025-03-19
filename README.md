# keyv-dataloader

A DataLoader implementation with caching support using [Keyv](https://github.com/jaredwray/keyv). Combines the batching capabilities of Facebook's DataLoader with the flexible caching of Keyv.

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

// Load a single value (returns a Promise)
const value = await loader.load('key1');

// Load multiple values (returns a Promise)
const values = await loader.loadMany(['key2', 'key3']);

// Prime the cache with a value (returns this for chaining)
loader.prime('key4', 'Value for key4');

// Clear a value from cache (returns this for chaining)
loader.clear('key1');

// Clear multiple values from cache (returns this for chaining)
loader.clearMany(['key2', 'key3']);

// Clear all cached values (returns this for chaining)
loader.clearAll();

// Method chaining
loader
  .clear('key1')
  .prime('key2', 'new value')
  .prime('key3', 'another value');
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
- **`prime(key, value)`**: Prime the cache with a key-value pair
- **`clear(key)`**: Clear a key from cache
- **`clearMany(keys)`**: Clear multiple keys from cache (extension method)
- **`clearAll()`**: Clear all keys from cache

All methods except `load` and `loadMany` return the instance for method chaining.

## Features

- **DataLoader Compatible**: Implements the same API as Facebook's DataLoader
- **Batching**: Groups individual loads that occur within a single tick of the event loop into a single batch
- **Efficient Caching**: Uses Keyv's batch methods (getMany, setMany, deleteMany) for optimal performance
- **Flexible Storage**: Works with any Keyv storage adapter (Redis, MongoDB, SQLite, etc.)
- **TypeScript Support**: Fully typed API
- **Method Chaining**: All methods that don't return Promises support method chaining

## Performance

By leveraging Keyv's batch operations (`getMany`, `setMany`, and `deleteMany`), this implementation reduces the number of I/O operations required when working with multiple keys, resulting in better performance compared to individual operations, especially when using remote storage adapters like Redis.

## License

MIT
