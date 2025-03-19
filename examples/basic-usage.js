// This example demonstrates basic usage of KeyvDataLoader
const { KeyvDataLoader } = require('../dist');

// Mock database access function
async function fetchUsersFromDB(ids) {
  console.log(`🔍 Fetching users from database: ${ids.join(', ')}`);
  
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock user objects
  return ids.map(id => ({
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`
  }));
}

async function main() {
  // Create a new loader with caching
  const userLoader = new KeyvDataLoader({
    batchLoadFn: fetchUsersFromDB,
    ttl: 30 * 1000, // Cache for 30 seconds
    keyvOptions: {
      namespace: 'users'
    }
  });

  console.log('First request (not cached):');
  const user1 = await userLoader.load(1);
  console.log('✅ User 1:', user1);
  
  console.log('\nSecond request (should be cached):');
  const user1Again = await userLoader.load(1);
  console.log('✅ User 1 (from cache):', user1Again);
  
  console.log('\nPriming the cache with a value:');
  userLoader.prime(4, { id: 4, name: 'User 4 (Primed)', email: 'user4@example.com' });
  console.log('✅ User 4 primed in cache');
  
  console.log('\nLoading primed value (should not hit database):');
  const user4 = await userLoader.load(4);
  console.log('✅ User 4 (from prime):', user4);
  
  console.log('\nBatch request (user 2 and 3 not cached, will be fetched in batch):');
  const [user2, user3] = await userLoader.loadMany([2, 3]);
  console.log('✅ User 2:', user2);
  console.log('✅ User 3:', user3);
  
  console.log('\nDemonstrating method chaining:');
  userLoader
    .clear(1)
    .clear(2)
    .prime(5, { id: 5, name: 'User 5 (Chained Prime)', email: 'user5@example.com' });
  console.log('✅ Cleared users 1 and 2, primed user 5');
  
  console.log('\nAfter clearing, users 1 and 2 should be fetched again in batch:');
  const [user1Refetched, user2Refetched, user5] = await userLoader.loadMany([1, 2, 5]);
  console.log('✅ User 1 (refetched):', user1Refetched);
  console.log('✅ User 2 (refetched):', user2Refetched);
  console.log('✅ User 5 (from prime):', user5);
  
  console.log('\nClearing all cache:');
  userLoader.clearAll();
  console.log('✅ All cache cleared');
  
  // Access all users (should be fetched from database)
  console.log('\nAccessing all users after clearing all (should hit database):');
  const allUsers = await userLoader.loadMany([1, 2, 3, 4, 5]);
  console.log('✅ All users fetched again:', allUsers.length);
}

main().catch(console.error);
