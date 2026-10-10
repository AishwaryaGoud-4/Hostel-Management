const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');

// Non-destructive: creates or updates a single SUPER_ADMIN, leaves all other data intact.
// Usage: npm run create-admin -- <email> <password> [firstName] [lastName] [phone]
const [email = 'admin@shms.com', password = 'Password@123', firstName = 'Super', lastName = 'Admin', phone = '9999999999'] =
  process.argv.slice(2);

const run = async () => {
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  await connectDB();
  const otherAdmin = await User.findOne({ role: 'SUPER_ADMIN', email: { $ne: email.toLowerCase() } }).select('email');
  if (otherAdmin) {
    console.error(`An admin already exists (${otherAdmin.email}). The system allows only one admin account.`);
    console.error(`To reset its password run: npm run create-admin -- ${otherAdmin.email} <newPassword>`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    existing.password = hashedPassword;
    existing.role = 'SUPER_ADMIN';
    existing.isActive = true;
    existing.approvalStatus = 'APPROVED';
    await existing.save();
    console.log(`Updated ${email} to SUPER_ADMIN with the new password.`);
  } else {
    await User.create({ firstName, lastName, email, password: hashedPassword, role: 'SUPER_ADMIN', phone });
    console.log(`Created SUPER_ADMIN ${email}.`);
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Failed to create admin:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
