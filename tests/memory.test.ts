import { KeyvDataLoader } from '../src';

describe('KeyvDataLoader with memory store', () => {
  // Mock batch loader function
  const batchLoadFn = jest.fn(async (keys: readonly string[]) => {
    return keys.map(key => `Value for ${key}`);
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
        ttl: 1000 // 1 second TTL for testing
      });
    });

    test('should load a single key', async () => {
      const result = await loader.load('key1');
      expect(result).toBe('Value for key1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      expect(batchLoadFn).toHaveBeenCalledWith(['key1']);
    });

    test('should batch multiple loads', async () => {
      const promises = [
        loader.load('key2'),
        loader.load('key3')
      ];
      const results = await Promise.all(promises);
      
      expect(results).toEqual([
        'Value for key2',
        'Value for key3'
      ]);
      
      // Should be called only once with both keys
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      expect(batchLoadFn).toHaveBeenCalledWith(['key2', 'key3']);
    });
    
    test('should cache results', async () => {
      // First load
      await loader.load('key1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      
      // Second load (should be cached)
      const cachedResult = await loader.load('key1');
      expect(cachedResult).toBe('Value for key1');
      
      // Should not call batchLoadFn again
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
    });
    
    test('should load many keys', async () => {
      const results = await loader.loadMany(['key4', 'key5']);
      expect(results).toEqual([
        'Value for key4',
        'Value for key5'
      ]);
      
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      expect(batchLoadFn).toHaveBeenCalledWith(['key4', 'key5']);
    });
  });

  describe('clearing cache', () => {
    let loader: KeyvDataLoader<string, string>;

    beforeEach(() => {
      loader = new KeyvDataLoader({ batchLoadFn });
    });

    test('should clear specific key from cache', async () => {
      // Load initial value
      await loader.load('key1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      
      // Clear the key
      loader.clear('key1');
      
      // Load again - should call batchLoadFn again
      await loader.load('key1');
      expect(batchLoadFn).toHaveBeenCalledTimes(2);
    });
    
    test('should clear all keys from cache', async () => {
      // Load initial values
      await loader.loadMany(['key1', 'key2']);
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      
      // Clear all keys
      loader.clearAll();
      
      // Load again - should call batchLoadFn again
      await loader.loadMany(['key1', 'key2']);
      expect(batchLoadFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('priming cache', () => {
    let loader: KeyvDataLoader<string, string>;

    beforeEach(() => {
      loader = new KeyvDataLoader({ batchLoadFn });
    });

    test('should prime the cache with a value', async () => {
      // Prime the cache
      loader.prime('key1', 'Primed value');
      
      // Load from cache - should not call batchLoadFn
      const result = await loader.load('key1');
      expect(result).toBe('Primed value');
      expect(batchLoadFn).not.toHaveBeenCalled();
    });
    
    test('should not override existing values with prime', async () => {
      // First load to cache the value
      await loader.load('key1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      
      // Try to prime with a different value
      loader.prime('key1', 'Different value');
      
      // Should still have the original value
      const result = await loader.load('key1');
      expect(result).toBe('Value for key1');
      
      // No additional call to batchLoadFn
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
    });
    
    test('should allow force-updating with clear and prime', async () => {
      // First load to cache the value
      await loader.load('key1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      
      // Clear and prime
      loader.clear('key1').prime('key1', 'Updated value');
      
      // Should have the new value
      const result = await loader.load('key1');
      expect(result).toBe('Updated value');
      
      // No additional call to batchLoadFn
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
    });
    
    test('should handle errors in prime', async () => {
      // Prime with error
      const error = new Error('Test error');
      loader.prime('key1', error);
      
      // Should throw the primed error
      await expect(loader.load('key1')).rejects.toThrow('Test error');
      expect(batchLoadFn).not.toHaveBeenCalled();
    });
  });

  describe('custom cache key function', () => {
    let loader: KeyvDataLoader<string, string>;
    
    beforeEach(() => {
      loader = new KeyvDataLoader({
        batchLoadFn,
        cacheKeyFn: (key) => `prefix:${key}`
      });
    });
    
    test('should use custom cache key function', async () => {
      // Load initial value
      await loader.load('key1');
      expect(batchLoadFn).toHaveBeenCalledTimes(1);
      
      // Prime with the raw key
      loader.prime('key1', 'Direct value');
      
      // Clear with a non-prefixed key (should work because of cacheKeyFn)
      loader.clear('key1');
      
      // Should call batchLoadFn again
      await loader.load('key1');
      expect(batchLoadFn).toHaveBeenCalledTimes(2);
    });
  });
});
