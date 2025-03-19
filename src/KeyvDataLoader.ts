import DataLoader from 'dataloader';
import Keyv from 'keyv';

export interface KeyvDataLoaderOptions<K, V, C = K> {
  /**
   * Function to batch load multiple keys
   */
  batchLoadFn: DataLoader.BatchLoadFn<K, V>;
  /**
   * Function to generate cache key from the input key
   */
  cacheKeyFn?: (key: K) => string;
  /**
   * TTL in milliseconds
   */
  ttl: number;
  /**
   * DataLoader options
   */
  dataLoaderOptions?: Omit<DataLoader.Options<K, V, C>, 'cache'>;
  /**
   * Keyv options
   */
  keyvOptions?: ConstructorParameters<typeof Keyv>[0];
}

export class KeyvDataLoader<K, V, C = K> {
  private dataloader: DataLoader<K, V, C>;
  private cache: Keyv<V>;
  private cacheKeyFn: (key: K) => string;
  private ttl: number;

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
    const wrappedBatchLoadFn = async (
      keys: readonly K[]
    ): Promise<(V | Error)[]> => {
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
        const result: (V | Error)[] = [];
        for (const cachedValue of cacheResults) {
          result.push(cachedValue as V | Error);
        }
        return result;
      }

      // Load uncached keys
      const loadedValues = await batchLoadFn(uncachedKeys);

      // Prepare entries for setMany
      const entries = uncachedKeys.map((key, index) => ({
        key: this.cacheKeyFn(key),
        value: loadedValues[index],
        ttl: this.ttl,
      }));

      // Set cache entries
      await Promise.all(
        entries.map((entry) =>
          this.cache.set(entry.key, entry.value, entry.ttl)
        )
      );

      // Merge cached and loaded results
      const results: (V | Error | undefined)[] = [...cacheResults];
      uncachedIndices.forEach((index, arrayIndex) => {
        results[index] = loadedValues[arrayIndex];
      });

      // Convert to final result format, handling undefined
      const finalResults: (V | Error)[] = [];
      for (const result of results) {
        finalResults.push(result as V | Error);
      }

      return finalResults;
    };

    this.dataloader = new DataLoader<K, V, C>(wrappedBatchLoadFn, {
      ...dataLoaderOptions,
      cache: false,
    });
  }

  /**
   * Loads a key, returning a `Promise` for the value represented by that key.
   *
   * This behaves identically to DataLoader's load method.
   */
  load(key: K): Promise<V> {
    return this.dataloader.load(key);
  }

  /**
   * Loads multiple keys, returning a Promise that resolves to an array of values.
   *
   * This behaves identically to DataLoader's loadMany method.
   */
  loadMany(keys: K[]): Promise<(V | Error)[]> {
    return this.dataloader.loadMany(keys);
  }

  /**
   * Clears the value for the key from dataloader and cache.
   *
   * This behaves like DataLoader's clear method but also clears the key from Keyv cache.
   *
   * Returns a Promise that resolves to this instance for method chaining.
   */
  async clear(key: K): Promise<this> {
    this.dataloader.clear(key);
    // Await cache clearing for proper error handling
    await this.cache.delete(this.cacheKeyFn(key));
    return this;
  }

  /**
   * Clears the entire cache dataloader and Keyv.
   *
   * This behaves like DataLoader's clearAll method but also clears the entire Keyv cache.
   *
   * Returns a Promise that resolves to this instance for method chaining.
   */
  async clearAll(): Promise<this> {
    this.dataloader.clearAll();
    // Await cache clearing for proper error handling
    await this.cache.clear();
    return this;
  }

  /**
   * Primes the cache with the provided key and value.
   * If the key already exists, no change is made.
   * (To forcefully prime the cache, clear the key first with
   * loader.clear(key).prime(key, value).)
   *
   * To prime the cache with an error at a key, provide an Error instance.
   *
   * Returns a Promise that resolves to this instance for method chaining.
   */
  async prime(key: K, value: V | Error): Promise<this> {
    this.dataloader.prime(key, value);

    // Only cache in Keyv if the key doesn't exist and value is not an Error
    if (!(value instanceof Error)) {
      const existingValue = await this.cache.get(this.cacheKeyFn(key));
      if (existingValue === undefined) {
        await this.cache.set(this.cacheKeyFn(key), value, this.ttl);
      }
    } else {
      // If priming with an error, make sure to delete the key from the cache
      // This ensures the DataLoader error will be used when loading this key
      await this.cache.delete(this.cacheKeyFn(key));
    }

    return this;
  }
}
