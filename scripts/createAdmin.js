#!/usr/bin/env node
require('dotenv').config();
const path = require('path');
const bcrypt = require('bcrypt');

// Initialize DB connection
require(path.join(__dirname, '..', 'Models', 'db'));
const User = require(path.join(__dirname, '..', 'Models', 'User'));

async function main() {
  try {
    const args = process.argv.slice(2);
    const [nameArg, emailArg, passwordArg] = args;
    const name = nameArg || process.env.ADMIN_NAME;
    const email = emailArg || process.env.ADMIN_EMAIL;
    const password = passwordArg || process.env.ADMIN_PASSWORD;
    const force = args.includes('--force') || process.env.FORCE_CREATE_ADMIN === '1';

    if (!name || !email || !password) {
      console.error('Usage: node scripts/createAdmin.js "Full Name" email@example.com password [--force]');
      console.error('Or set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD env vars.');
      process.exit(1);
    }

    const existingAdminCount = await User.countDocuments({ role: 'admin' });
    if (existingAdminCount > 0 && !force) {
      console.error(`Aborting: ${existingAdminCount} admin user(s) already exist. Use --force to create another.`);
      process.exit(2);
    }

    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
      console.error('Aborting: a user with this email already exists.');
      process.exit(3);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'admin',
      doctorApproved: true,
      verified: true,
    });

    console.log('✅ Admin user created:', { id: user._id.toString(), email: user.email, name: user.name });
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create admin:', err);
    process.exit(10);
  }
}

main();
