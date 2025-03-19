import { KeyvDataLoader } from '../src';
import KeyvMemcache from 'keyv-memcache';

const MEMCACHED_URI = 'localhost:11211';

describe('KeyvDataLoader with Memcached store', () => {
  // Mock batch loader function
  const batchLoadFn = jest.fn(async (keys: readonly string[]) => {
    return keys.map(key => `Memcached value for ${key}`);
  });

  // Skip tests if Memcached is not available
  beforeAll(async () => {
    const store = new KeyvMemcache(MEMCACHED_URI);
    
    try {
      // Try to set and get a value from Memcached
      // The TTL is in milliseconds for Keyv but the underlying Memcache adapter needs it in seconds
      await store.set('test-connection', 'test'); // Removed the TTL parameter
      await store.get('test-connection');
    } catch (error) {
      console.warn('Memcached not available, skipping Memcached tests');
      return;
    }
  });

  // Reset mock before each test
  beforeEach(() => {
    batchLoadFn.mockClear();
  });

  describe('basic functionality', () => {
    let loader: KeyvDataLoader<string, string>;

    beforeEach(() => {
      loader = new KeyvDataLoader({
        batchLoadFn,
        ttl: 1000, // 1 second TTL for testing
        keyvOptions: {
          store: new KeyvMemcache(MEMCACHED_URI),
          namespace: 'test-memcached'
        }
      });
    });

    test('should load a single key', async () => {
      const result = await loader.load('mc1');
      expect(result).toBe('Memcached value for mc1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
    });

    test('should batch multiple loads', async () => {
      const promises = [
        loader.load('mc2'),
        loader.load('mc3')
      ];
      const results = await Promise.all(promises);
      
      expect(results).toEqual([
        'Memcached value for mc2',
        'Memcached value for mc3'
      ]);
      
      // Should be called only once with both keys
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
    });
    
    test('should cache results', async () => {
      // First load
      await loader.load('mc4');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      
      // Second load (should be cached)
      const cachedResult = await loader.load('mc4');
      expect(cachedResult).toBe('Memcached value for mc4');
      
      // Should not call batchLoadFn again
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
    });
    
    test('should respect TTL', async () => {
      // Create a loader with very short TTL
      const shortTtlLoader = new KeyvDataLoader({
        batchLoadFn,
        ttl: 100, // 100ms TTL
        keyvOptions: {
          store: new KeyvMemcache(MEMCACHED_URI),
          namespace: 'test-memcached-ttl'
        }
      });
      
      // First load
      await shortTtlLoader.load('mc-expiring');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Second load (should not be cached anymore)
      await shortTtlLoader.load('mc-expiring');
      expect(batchLoadFn).toHaveBeenCalledTimes(2);
    }, 1000); // Increased timeout for this test
  });

  describe('clearing and priming', () => {
    let loader: KeyvDataLoader<string, string>;

    beforeEach(() => {
      loader = new KeyvDataLoader({
        batchLoadFn,
        keyvOptions: {
          store: new KeyvMemcache(MEMCACHED_URI),
          namespace: 'test-memcached-ops'
        }
      });
    });

    test('should clear specific key from cache', async () => {
      // Load initial value
      await loader.load('mc-clear-1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      
      // Clear the key
      loader.clear('mc-clear-1');
      
      // Wait a bit for async clear operation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Load again - should call batchLoadFn again
      await loader.load('mc-clear-1');
      expect(batchLoadFn).toHaveBeenCalledTimes(2);
    });
    
    test('should prime the cache with a value', async () => {
      // Prime the cache
      loader.prime('mc-prime-1', 'Primed Memcached value');
      
      // Wait a bit for async prime operation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Load from cache - should not call batchLoadFn
      const result = await loader.load('mc-prime-1');
      expect(result).toBe('Primed Memcached value');
      expect(batchLoadFn).not.toHaveBeenCalled();
    });
    
    test('should handle complex objects', async () => {
      // Complex object
      const complexObject = {
        id: 123,
        name: 'Complex Object',
        nested: {
          field: 'value',
          array: [1, 2, 3]
        }
      };
      
      // Set up loader that returns complex objects
      const complexLoader = new KeyvDataLoader({
        batchLoadFn: async (keys: readonly string[]) => {
          return keys.map(() => complexObject);
        },
        keyvOptions: {
          store: new KeyvMemcache(MEMCACHED_URI),
          namespace: 'test-memcached-complex'
        }
      });
      
      // Load the object
      const result = await complexLoader.load('mc-complex');
      expect(result).toEqual(complexObject);
      
      // Load again (should be from cache)
      const cachedResult = await complexLoader.load('mc-complex');
      expect(cachedResult).toEqual(complexObject);
    });
  });
});
