const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    whatsapp_number: {
        type: String,
        default: '917356821364'
    },
    email_user: {
        type: String,
        default: ''
    },
    email_pass: {
        type: String,
        default: ''
    },
    email_from_name: {
        type: String,
        default: 'Destin.in Tours'
    },
    email_from_address: {
        type: String,
        default: ''
    },
    admin_notification_email: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);
