const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password_hash: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: false
    },
    whatsapp: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false
    },
    role: {
        type: String,
        default: 'user',
        enum: ['user', 'admin']
    },
    reset_otp: { type: String },
    reset_otp_expiry: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
