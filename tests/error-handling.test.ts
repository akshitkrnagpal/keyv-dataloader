import { KeyvDataLoader } from '../src';

describe('KeyvDataLoader error handling', () => {
  describe('handling batch errors', () => {
    test('should handle errors in batch function', async () => {
      // Batch function that throws an error for certain keys
      const errorBatchFn = async (keys: readonly string[]) => {
        return keys.map(key => {
          if (key === 'error-key') {
            throw new Error('Error in batch');
          }
          return `Value for ${key}`;
        });
      };
      
      const loader = new KeyvDataLoader({
        batchLoadFn: errorBatchFn
      });
      
      // Should handle error properly
      await expect(loader.load('error-key')).rejects.toThrow('Error in batch');
      
      // Should still work for normal keys
      const result = await loader.load('normal-key');
      expect(result).toBe('Value for normal-key');
    });
    
    test('should handle errors in loadMany', async () => {
      // Batch function that returns a mix of values and errors
      const mixedBatchFn = async (keys: readonly string[]) => {
        return keys.map(key => {
          if (key.includes('error')) {
            return new Error(`Error for ${key}`);
          }
          return `Value for ${key}`;
        });
      };
      
      const loader = new KeyvDataLoader({
        batchLoadFn: mixedBatchFn
      });
      
      // loadMany should return a mix of values and errors
      const results = await loader.loadMany(['normal-key', 'error-key']);
      expect(results[0]).toBe('Value for normal-key');
      expect(results[1]).toBeInstanceOf(Error);
      expect((results[1] as Error).message).toBe('Error for error-key');
    });
  });
  
  describe('edge cases', () => {
    test('should handle empty batch', async () => {
      const batchFn = jest.fn(async (keys: readonly string[]) => {
        return keys.map(key => `Value for ${key}`);
      });
      
      const loader = new KeyvDataLoader({
        batchLoadFn: batchFn
      });
      
      const results = await loader.loadMany([]);
      expect(results).toEqual([]);
      expect(batchFn).not.toHaveBeenCalled();
    });
    
    test('should handle very large keys and values', async () => {
      const largeString = 'x'.repeat(10000);
      
      const loader = new KeyvDataLoader({
        batchLoadFn: async (keys: readonly string[]) => {
          return keys.map(key => `${largeString}-${key}`);
        }
      });
      
      const result = await loader.load('large-key');
      expect(result).toBe(`${largeString}-large-key`);
      
      // Load again to test caching
      const cachedResult = await loader.load('large-key');
      expect(cachedResult).toBe(`${largeString}-large-key`);
    });
    
    test('should handle null and undefined values', async () => {
      // Note: DataLoader doesn't allow undefined values, but does allow null
      const loader = new KeyvDataLoader({
        batchLoadFn: async (keys: readonly string[]) => {
          return keys.map(key => {
            if (key === 'null-key') return null;
            return `Value for ${key}`;
          });
        }
      });
      
      const result = await loader.load('null-key');
      expect(result).toBeNull();
      
      // Load again to test caching of null
      const cachedResult = await loader.load('null-key');
      expect(cachedResult).toBeNull();
    });
  });
  
  describe('cache key function', () => {
    test('should handle custom cache key function', async () => {
      // Mocked batch loader
      const batchFn = jest.fn(async (keys: readonly string[]) => {
        return keys.map(key => `Value for ${key}`);
      });
      
      // Create a loader with a custom cache key function
      const loader = new KeyvDataLoader({
        batchLoadFn: batchFn,
        cacheKeyFn: (key) => `custom:${key}`
      });
      
      // First call should use the batch function
      await loader.load('key1');
      expect(batchFn).toHaveBeenCalledTimes(1);
      
      // Second call should use the cache
      await loader.load('key1');
      expect(batchFn).toHaveBeenCalledTimes(1);
      
      // Directly verify the cache key function is working
      const result = await loader.load('key1');
      expect(result).toBe('Value for key1');
      
      // Clear with the raw key (should work because of the cacheKeyFn)
      loader.clear('key1');
      
      // Now batch function should be called again
      await loader.load('key1');
      expect(batchFn).toHaveBeenCalledTimes(2);
    });
    
    test('should handle complex objects as keys', async () => {
      // Complex object keys
      const objectKey1 = { id: 1, name: 'Object 1' };
      const objectKey2 = { id: 1, name: 'Object 1' }; // Same content, different instance
      const objectKey3 = { id: 2, name: 'Object 2' }; // Different content
      
      // Custom cache key function for objects
      const cacheKeyFn = (key: { id: number, name: string }) => {
        return `obj:${key.id}:${key.name}`;
      };
      
      // Mocked batch loader
      const batchFn = jest.fn(async (keys: readonly { id: number, name: string }[]) => {
        return keys.map(key => `Value for object ${key.id}`);
      });
      
      // Create loader with custom cache key function
      const loader = new KeyvDataLoader({
        batchLoadFn: batchFn,
        cacheKeyFn
      });
      
      // First call
      const result1 = await loader.load(objectKey1);
      expect(result1).toBe('Value for object 1');
      expect(batchFn).toHaveBeenCalledTimes(1);
      
      // Second call with different instance but same content
      const result2 = await loader.load(objectKey2);
      expect(result2).toBe('Value for object 1');
      expect(batchFn).toHaveBeenCalledTimes(1); // No additional call
      
      // Call with different object
      const result3 = await loader.load(objectKey3);
      expect(result3).toBe('Value for object 2');
      expect(batchFn).toHaveBeenCalledTimes(2); // Additional call
    });
  });
});
