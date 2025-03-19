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
  
  console.log('\nBatch request (user 2 and 3 not cached, will be fetched in batch):');
  const [user2, user3] = await userLoader.loadMany([2, 3]);
  console.log('✅ User 2:', user2);
  console.log('✅ User 3:', user3);
  
  console.log('\nBatch clear from cache:');
  const clearResult = await userLoader.clearMany([1, 2]);
  console.log('✅ Cleared multiple keys:', clearResult);
  
  console.log('\nAfter clearing, users 1 and 2 should be fetched again in batch:');
  const [user1Refetched, user2Refetched] = await userLoader.loadMany([1, 2]);
  console.log('✅ User 1 (refetched):', user1Refetched);
  console.log('✅ User 2 (refetched):', user2Refetched);
  
  // Access cached users (should be served from cache)
  console.log('\nAccessing all users (user 3 from cache, 1 and 2 just cached):');
  const allUsers = await userLoader.loadMany([1, 2, 3]);
  console.log('✅ All users:', allUsers);
}

main().catch(console.error);
