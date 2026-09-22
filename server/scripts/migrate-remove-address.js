const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function migrate() {
  console.log('=== REMOVING ADDRESS FIELD FROM MONGODB USERS ===');
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in environment');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  // Directly access the collection to remove the field from all documents
  const usersCollection = mongoose.connection.collection('users');

  const beforeCount = await usersCollection.countDocuments({ address: { $exists: true } });
  console.log(`Documents with address field before migration: ${beforeCount}`);

  if (beforeCount > 0) {
    const result = await usersCollection.updateMany(
      {},
      { $unset: { address: 1 } }
    );
    console.log(`Modified documents: ${result.modifiedCount}`);
  } else {
    console.log('No documents found with address field.');
  }

  const afterCount = await usersCollection.countDocuments({ address: { $exists: true } });
  console.log(`Documents with address field after migration: ${afterCount}`);

  if (afterCount !== 0) {
    throw new Error(`Migration incomplete: ${afterCount} documents still have address!`);
  }

  console.log('✓ Successfully removed address field from all user documents.');
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(async (err) => {
  console.error('Migration failed:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
