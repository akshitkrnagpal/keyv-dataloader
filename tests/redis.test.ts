import { KeyvDataLoader } from '../src';
import KeyvRedis from '@keyv/redis';

const REDIS_URI = 'redis://localhost:6379';

describe('KeyvDataLoader with Redis store', () => {
  // Mock batch loader function
  const batchLoadFn = jest.fn(async (keys: readonly string[]) => {
    return keys.map((key) => `Redis value for ${key}`);
  });

  // Reset mock and clear Redis before each test
  beforeEach(async () => {
    batchLoadFn.mockClear();

    // Clean Redis before each test
    try {
      const store = new KeyvRedis(REDIS_URI);
      await store.clear();
    } catch (error) {
      console.warn('Failed to flush Redis, some tests may fail');
    }
  });

  describe('basic functionality', () => {
    let loader: KeyvDataLoader<string, string>;

    beforeEach(() => {
      loader = new KeyvDataLoader({
        batchLoadFn,
        ttl: 1000, // 1 second TTL for testing
        keyvOptions: {
          store: new KeyvRedis(REDIS_URI),
          namespace: 'test',
        },
      });
    });

    test('should load a single key', async () => {
      const result = await loader.load('redis1');
      expect(result).toBe('Redis value for redis1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
    });

    test('should batch multiple loads', async () => {
      const promises = [loader.load('redis2'), loader.load('redis3')];
      const results = await Promise.all(promises);

      expect(results).toEqual([
        'Redis value for redis2',
        'Redis value for redis3',
      ]);

      // Should be called only once with both keys
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
    });

    test('should cache results', async () => {
      // First load
      const cachedResult = await loader.load('redis6');
      expect(cachedResult).toBe('Redis value for redis6');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);

      // Second load (should be cached)
      const cachedResult2 = await loader.load('redis6');
      expect(cachedResult2).toBe('Redis value for redis6');

      // Should not call batchLoadFn again
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
    });

    test('should respect TTL', async () => {
      // Create a loader with very short TTL
      const shortTtlLoader = new KeyvDataLoader({
        batchLoadFn,
        ttl: 100, // 100ms TTL
        keyvOptions: {
          store: new KeyvRedis(REDIS_URI),
          namespace: 'test-ttl',
        },
      });

      // First load
      await shortTtlLoader.load('expiring');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);

      // Second load (should be cached)
      await shortTtlLoader.load('expiring');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third load (should not be cached anymore)
      await shortTtlLoader.load('expiring');
      expect(batchLoadFn).toHaveBeenCalledTimes(2);
    }, 1000); // Increased timeout for this test
  });

  describe('clearing cache', () => {
    let loader: KeyvDataLoader<string, string>;

    beforeEach(() => {
      loader = new KeyvDataLoader({
        batchLoadFn,
        ttl: 1000,
        keyvOptions: {
          store: new KeyvRedis(REDIS_URI),
          namespace: 'test-clear',
        },
      });
    });

    test('should clear specific key from cache', async () => {
      // Load initial value
      await loader.load('redis-clear-1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);

      // Clear the key
      loader.clear('redis-clear-1');

      // Wait a bit for async clear operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Load again - should call batchLoadFn again
      await loader.load('redis-clear-1');
      expect(batchLoadFn).toHaveBeenCalledTimes(2);
    });

    test('should clear all keys from cache', async () => {
      // Load initial values
      await loader.loadMany(['redis-clear-2', 'redis-clear-3']);
      expect(batchLoadFn).toHaveBeenCalledTimes(1);

      // Clear all keys
      loader.clearAll();

      // Wait a bit for async clear operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Load again - should call batchLoadFn again
      await loader.loadMany(['redis-clear-2', 'redis-clear-3']);
      expect(batchLoadFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('priming cache', () => {
    let loader: KeyvDataLoader<string, string>;

    beforeEach(() => {
      loader = new KeyvDataLoader({
        batchLoadFn,
        ttl: 1000,
        keyvOptions: {
          store: new KeyvRedis(REDIS_URI),
          namespace: 'test-prime',
        },
      });
    });

    test('should prime the cache with a value', async () => {
      // Prime the cache
      loader.prime('redis-prime-1', 'Primed Redis value');

      // Wait a bit for async prime operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Load from cache - should not call batchLoadFn
      const result = await loader.load('redis-prime-1');
      expect(result).toBe('Primed Redis value');
      expect(batchLoadFn).not.toHaveBeenCalled();
    });

    test('should allow force-updating with clear and prime', async () => {
      // First load to cache the value
      await loader.load('redis-prime-2');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);

      // Clear and prime
      loader
        .clear('redis-prime-2')
        .prime('redis-prime-2', 'Updated Redis value');

      // Wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have the new value
      const result = await loader.load('redis-prime-2');
      expect(result).toBe('Updated Redis value');

      // No additional call to batchLoadFn
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
    });
  });
});
