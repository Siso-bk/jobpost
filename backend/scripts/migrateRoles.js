const mongoose = require('mongoose');
const User = require('../models/User');

require('dotenv').config();

const VALID_ROLES = new Set(['worker', 'employer', 'admin']);

const normalizeRoles = (input) => {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  const normalized = values
    .map((role) => String(role || '').trim().toLowerCase())
    .filter((role) => VALID_ROLES.has(role));
  return Array.from(new Set(normalized));
};

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const cursor = User.collection.find({
    $or: [{ role: { $exists: true } }, { roles: { $exists: false } }, { roles: { $size: 0 } }]
  });

  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const roles = normalizeRoles(doc.roles);
    if (roles.length === 0 && doc.role) {
      roles.push(...normalizeRoles(doc.role));
    }
    if (roles.length === 0) {
      roles.push('worker');
    }
    await User.collection.updateOne(
      { _id: doc._id },
      { $set: { roles }, $unset: { role: '' } }
    );
    updated += 1;
  }

  console.log(`Updated ${updated} user(s).`);
  process.exit(0);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
