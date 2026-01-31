const mongoose = require('mongoose');
const User = require('../models/User');

require('dotenv').config();

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
};

const email = getArg('--email') || getArg('-e');
const id = getArg('--id') || getArg('-i');

if (!email && !id) {
  console.error('Usage: node scripts/grantAdmin.js --email you@example.com');
  console.error('   or: node scripts/grantAdmin.js --id <mongo_user_id>');
  process.exit(1);
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const filter = email ? { email: email.toLowerCase().trim() } : { _id: id };
  const user = await User.findOne(filter);

  if (!user) {
    console.error('User not found.');
    process.exit(1);
  }

  const roles = new Set(Array.isArray(user.roles) ? user.roles : []);
  if (user.role) roles.add(user.role);
  roles.add('admin');
  user.roles = Array.from(roles);
  await user.save();

  console.log(`Admin role granted to ${user.email || user._id}.`);
  process.exit(0);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
