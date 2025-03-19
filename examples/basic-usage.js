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
  
  console.log('\nTrying to prime an existing key (should not change the value):');
  userLoader.prime(1, { id: 1, name: 'User 1 (Modified)', email: 'modified1@example.com' });
  console.log('✅ Attempted to prime user 1 with a new value');
  
  console.log('\nLoading user 1 (should still have original value):');
  const user1NoChange = await userLoader.load(1);
  console.log('✅ User 1 (should be unchanged):', user1NoChange);
  
  console.log('\nForce-priming an existing key using clear() and prime():');
  userLoader
    .clear(1)
    .prime(1, { id: 1, name: 'User 1 (Force-Modified)', email: 'forcemodified1@example.com' });
  console.log('✅ Force-primed user 1 with a new value');
  
  console.log('\nLoading user 1 again (should have new forced value):');
  const user1Changed = await userLoader.load(1);
  console.log('✅ User 1 (should be changed):', user1Changed);
  
  console.log('\nPriming with an error:');
  userLoader.prime(5, new Error('This is an error for user 5'));
  console.log('✅ Primed user 5 with an error');
  
  console.log('\nTrying to load user 5 (should get an error):');
  try {
    await userLoader.load(5);
  } catch (error) {
    console.log('✅ Got expected error:', error.message);
  }
  
  console.log('\nBatch request (user 2 and 3 not cached, will be fetched in batch):');
  const [user2, user3] = await userLoader.loadMany([2, 3]);
  console.log('✅ User 2:', user2);
  console.log('✅ User 3:', user3);
  
  console.log('\nClearing all cache:');
  userLoader.clearAll();
  console.log('✅ All cache cleared');
  
  // Access all users (should be fetched from database)
  console.log('\nAccessing users after clearing all (should hit database):');
  const allUsers = await userLoader.loadMany([1, 2, 3, 4]);
  console.log('✅ All users fetched again:', allUsers.length);
}

main().catch(console.error);
