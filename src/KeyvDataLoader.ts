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

interface KeyvEntry<V> {
  key: string;
  value: V;
  ttl?: number;
}

export class KeyvDataLoader<K, V, C = K> {
  private dataloader: DataLoader<K, V, C>;
  private cache: Keyv<V>;
  private cacheKeyFn: (key: K) => string;
  private ttl?: number;

  constructor(options: KeyvDataLoaderOptions<K, V, C>) {
    const {
      batchLoadFn,
      cacheKeyFn = (key) => String(key),
      ttl,
      dataLoaderOptions,
      keyvOptions,
    } = options;

    this.cacheKeyFn = cacheKeyFn;
    this.ttl = ttl;
    this.cache = new Keyv<V>({ ttl, ...keyvOptions });

    // Create a wrapper around batchLoadFn that checks cache first
    const wrappedBatchLoadFn = async (keys: readonly K[]): Promise<V[]> => {
      // Convert input keys to cache keys
      const cacheKeys = keys.map(this.cacheKeyFn);
      
      // Get values from cache using getMany
      const cacheResults = await this.cache.getMany(cacheKeys);

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

      // Prepare entries for setMany
      const entries: KeyvEntry<V>[] = uncachedKeys.map((key, index) => ({
        key: this.cacheKeyFn(key),
        value: loadedValues[index],
        ttl: this.ttl
      }));

      // Cache the loaded values using setMany
      await this.cache.setMany(entries);

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

    this.dataloader = new DataLoader<K, V, C>(
      wrappedBatchLoadFn,
      dataLoaderOptions
    );
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
   * Clear multiple keys from the cache
   */
  async clearMany(keys: K[]): Promise<boolean> {
    keys.forEach(key => this.dataloader.clear(key));
    // Note: Keyv's deleteMany actually returns a boolean, not an array
    return this.cache.deleteMany(keys.map(this.cacheKeyFn));
  }

  /**
   * Clear the entire cache
   */
  async clearAll(): Promise<void> {
    this.dataloader.clearAll();
    await this.cache.clear();
  }
}
