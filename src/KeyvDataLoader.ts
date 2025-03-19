import DataLoader from "dataloader";
import Keyv from "keyv";

export interface KeyvDataLoaderOptions<K, V, C = K> {
  /**
   * Function to batch load multiple keys
   */
  batchLoadFn: (keys: readonly K[]) => Promise<V[]>;
  /**
   * Function to generate cache key from the input key
   */
  cacheKeyFn?: (key: K) => string;
  /**
   * TTL in milliseconds
   */
  ttl?: number;
  /**
   * DataLoader options
   */
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  /**
   * Keyv options
   */
  keyvOptions?: ConstructorParameters<typeof Keyv>[0];
}

export class KeyvDataLoader<K, V, C = K> {
  private dataloader: DataLoader<K, V, C>;
  private cache: Keyv<V>;
  private cacheKeyFn: (key: K) => string;

  constructor(options: KeyvDataLoaderOptions<K, V, C>) {
    const {
      batchLoadFn,
      cacheKeyFn = (key) => String(key),
      ttl,
      dataLoaderOptions,
      keyvOptions,
    } = options;

    this.cacheKeyFn = cacheKeyFn;
    this.cache = new Keyv<V>({ ttl, ...keyvOptions });

    // Create a wrapper around batchLoadFn that checks cache first
    const wrappedBatchLoadFn = async (keys: readonly K[]): Promise<V[]> => {
      const cacheKeys = keys.map(this.cacheKeyFn);
      const cacheResults = await Promise.all(
        cacheKeys.map((key) => this.cache.get(key))
      );

      // Find keys that need to be loaded
      const uncachedIndices: number[] = [];
      const uncachedKeys: K[] = [];
      keys.forEach((key, index) => {
        if (cacheResults[index] === undefined) {
          uncachedIndices.push(index);
          uncachedKeys.push(key);
        }
      });

      if (uncachedKeys.length === 0) {
        // All values were in cache
        const result: V[] = [];
        for (const cachedValue of cacheResults) {
          if (cachedValue === undefined) {
            throw new Error("Cache returned undefined value");
          }
          result.push(cachedValue as V);
        }
        return result;
      }

      // Load uncached keys
      const loadedValues = await batchLoadFn(uncachedKeys);

      // Cache the loaded values
      await Promise.all(
        uncachedKeys.map((key, index) =>
          this.cache.set(this.cacheKeyFn(key), loadedValues[index])
        )
      );

      // Merge cached and loaded results
      const results: (V | undefined)[] = [...cacheResults];
      uncachedIndices.forEach((index, arrayIndex) => {
        results[index] = loadedValues[arrayIndex];
      });

      // Convert to final result format, handling undefined
      const finalResults: V[] = [];
      for (const result of results) {
        if (result === undefined) {
          throw new Error("Result is unexpectedly undefined");
        }
        finalResults.push(result);
      }
      
      return finalResults;
    };

    this.dataloader = new DataLoader<K, V, C>(wrappedBatchLoadFn, dataLoaderOptions);
  }

  /**
   * Load a single key
   */
  load(key: K): Promise<V> {
    return this.dataloader.load(key);
  }

  /**
   * Load multiple keys
   */
  loadMany(keys: K[]): Promise<(V | Error)[]> {
    return this.dataloader.loadMany(keys);
  }

  /**
   * Clear the cache for a specific key
   */
  async clear(key: K): Promise<boolean> {
    this.dataloader.clear(key);
    return this.cache.delete(this.cacheKeyFn(key));
  }

  /**
   * Clear the entire cache
   */
  async clearAll(): Promise<void> {
    this.dataloader.clearAll();
    await this.cache.clear();
  }
}
