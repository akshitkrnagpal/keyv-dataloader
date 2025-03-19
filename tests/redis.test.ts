import { KeyvDataLoader } from '../src';
import KeyvRedis from '@keyv/redis';

const REDIS_URI = 'redis://localhost:6379';

describe('KeyvDataLoader with Redis store', () => {
  // Reset mock and clear Redis before each test
  beforeEach(async () => {
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
    let testBatchLoadFn: jest.Mock;

    beforeEach(() => {
      // Create a fresh mock for this test
      testBatchLoadFn = jest.fn(async (keys: readonly string[]) => {
        return keys.map((key) => `Redis value for ${key}`);
      });

      loader = new KeyvDataLoader({
        batchLoadFn: testBatchLoadFn,
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
      expect(testBatchLoadFn).toHaveBeenCalledTimes(1);
    });

    test('should batch multiple loads', async () => {
      const promises = [loader.load('redis2'), loader.load('redis3')];
      const results = await Promise.all(promises);

      expect(results).toEqual([
        'Redis value for redis2',
        'Redis value for redis3',
      ]);

      // Should be called only once with both keys
      expect(testBatchLoadFn).toHaveBeenCalledTimes(1);
    });

    test('should cache results', async () => {
      // First load
      const cachedResult = await loader.load('redis6');
      expect(cachedResult).toBe('Redis value for redis6');
      expect(testBatchLoadFn).toHaveBeenCalledTimes(1);

      // Second load (should be cached)
      const cachedResult2 = await loader.load('redis6');
      expect(cachedResult2).toBe('Redis value for redis6');

      // Should not call batchLoadFn again
      expect(testBatchLoadFn).toHaveBeenCalledTimes(1);
    });

    test('should respect TTL', async () => {
      // Create a loader with very short TTL
      const shortTtlLoader = new KeyvDataLoader({
        batchLoadFn: testBatchLoadFn,
        ttl: 100, // 100ms TTL
        keyvOptions: {
          store: new KeyvRedis(REDIS_URI),
          namespace: 'test-ttl',
        },
      });

      // First load
      await shortTtlLoader.load('expiring');
      expect(testBatchLoadFn).toHaveBeenCalledTimes(1);

      // Second load (should be cached)
      await shortTtlLoader.load('expiring');
      expect(testBatchLoadFn).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third load (should not be cached anymore)
      await shortTtlLoader.load('expiring');
      expect(testBatchLoadFn).toHaveBeenCalledTimes(2);
    }, 1000); // Increased timeout for this test
  });

  describe('clearing specific key', () => {
    let loader: KeyvDataLoader<string, string>;
    let testBatchLoadFn: jest.Mock;

    beforeEach(() => {
      // Create a fresh mock for this test
      testBatchLoadFn = jest.fn(async (keys: readonly string[]) => {
        return keys.map((key) => `Redis value for ${key}`);
      });

      loader = new KeyvDataLoader({
        batchLoadFn: testBatchLoadFn,
        ttl: 1000,
        keyvOptions: {
          store: new KeyvRedis(REDIS_URI),
        },
      });
    });

    test('should remove key from both caches', async () => {
      // First load to cache the value
      await loader.load('redis-clear-1');
      expect(testBatchLoadFn).toHaveBeenCalledTimes(1);

      // Clear the key
      await loader.clear('redis-clear-1');

      // Should call batch loader again
      await loader.load('redis-clear-1');
      expect(testBatchLoadFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearing all keys', () => {
    let loader: KeyvDataLoader<string, string>;
    let testBatchLoadFn: jest.Mock;

    beforeEach(() => {
      // Create a fresh mock for this test
      testBatchLoadFn = jest.fn(async (keys: readonly string[]) => {
        return keys.map((key) => `Redis value for ${key}`);
      });

      loader = new KeyvDataLoader({
        batchLoadFn: testBatchLoadFn,
        ttl: 1000,
        keyvOptions: {
          store: new KeyvRedis(REDIS_URI),
        },
      });
    });

    test('should remove all keys from both caches', async () => {
      // Load multiple values
      await loader.loadMany(['redis-clear-all-1', 'redis-clear-all-2']);
      expect(testBatchLoadFn).toHaveBeenCalledTimes(1);

      // Clear all keys
      await loader.clearAll();

      // Should call batch loader again
      await loader.loadMany(['redis-clear-all-1', 'redis-clear-all-2']);
      expect(testBatchLoadFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('priming cache', () => {
    let loader: KeyvDataLoader<string, string>;
    let testBatchLoadFn: jest.Mock;

    beforeEach(() => {
      // Create a fresh mock for this test
      testBatchLoadFn = jest.fn(async (keys: readonly string[]) => {
        return keys.map((key) => `Redis value for ${key}`);
      });

      loader = new KeyvDataLoader({
        batchLoadFn: testBatchLoadFn,
        ttl: 1000,
        keyvOptions: {
          store: new KeyvRedis(REDIS_URI),
        },
      });
    });

    test('should preload values without batch loading', async () => {
      // Prime a key in the cache
      await loader.prime('redis-prime-1', 'Primed Redis value');

      // Should get the primed value without calling batch loader
      const result = await loader.load('redis-prime-1');
      expect(result).toBe('Primed Redis value');
      expect(testBatchLoadFn).not.toHaveBeenCalled();
    });

    test('should allow force-updating with clear and prime', async () => {
      // First load to cache the value
      await loader.load('redis-prime-2');
      expect(testBatchLoadFn).toHaveBeenCalledTimes(1);

      // Clear and prime
      await loader.clear('redis-prime-2');
      await loader.prime('redis-prime-2', 'Updated Redis value');

      // Should have the new value
      const result = await loader.load('redis-prime-2');
      expect(result).toBe('Updated Redis value');

      // No additional call to batchLoadFn
      expect(testBatchLoadFn).toHaveBeenCalledTimes(1);
    });
  });
});
