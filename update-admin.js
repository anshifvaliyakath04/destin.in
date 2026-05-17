/**
 * ============================================================
 *  DESTIN.IN — EMERGENCY ADMIN PASSWORD RESET SCRIPT
 * ============================================================
 *
 *  USE THIS ONLY IF:
 *  - The admin forgot their password AND
 *  - Cannot receive the OTP email (e.g. email not configured)
 *
 *  NORMAL WAY (Recommended):
 *  1. Go to http://localhost:5000/login.html
 *  2. Click "🔑 Forgot Password?"
 *  3. Enter the admin email (set in .env as ADMIN_EMAIL)
 *  4. Follow the 5-step OTP verification flow
 *  5. Create a new password — done!
 *
 *  EMERGENCY WAY (Terminal only):
 *  1. Edit .env → set ADMIN_EMAIL and ADMIN_PASSWORD to new values
 *  2. Run:  node update-admin.js
 *  3. Restart:  node server.js
 *
 * ============================================================
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI    = process.env.MONGO_URI    || 'mongodb://localhost:27017/destin_db';
const NEW_EMAIL    = process.env.ADMIN_EMAIL;
const NEW_PASSWORD = process.env.ADMIN_PASSWORD;

if (!NEW_EMAIL || !NEW_PASSWORD) {
    console.error('\n❌  ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env\n');
    console.error('   Example:');
    console.error('     ADMIN_EMAIL=newadmin@example.com');
    console.error('     ADMIN_PASSWORD=MyNewPassword123\n');
    process.exit(1);
}

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password_hash: String,
    role: { type: String, default: 'user' }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

(async () => {
    console.log('\n🔄  Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB\n');

    const admin = await User.findOne({ role: 'admin' });

    if (!admin) {
        // No admin exists — create one fresh
        const hash = await bcrypt.hash(NEW_PASSWORD, 10);
        await User.create({ name: 'Admin', email: NEW_EMAIL, password_hash: hash, role: 'admin' });
        console.log(`✅  New admin account created!`);
    } else {
        // Update existing admin
        const hash = await bcrypt.hash(NEW_PASSWORD, 10);
        admin.email         = NEW_EMAIL;
        admin.password_hash = hash;
        await admin.save();
        console.log(`✅  Admin credentials updated successfully!\n`);
    }

    console.log(`   📧  Email    : ${NEW_EMAIL}`);
    console.log(`   🔐  Password : ${NEW_PASSWORD}`);
    console.log(`\n   You can now log in at: http://localhost:5000/login.html\n`);

    await mongoose.disconnect();
    process.exit(0);
})();
