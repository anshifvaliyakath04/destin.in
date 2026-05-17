const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    customer_name: { type: String },
    customer_phone: { type: String },
    customer_whatsapp: { type: String },
    customer_email: { type: String },
    customer_address: { type: String },
    pickup_location: { type: String },
    // Step 1
    destinations: [{ type: String }],
    // Step 2
    start_date: { type: String },
    duration: { type: String },
    // Step 3
    adults: { type: Number },
    children: { type: Number },
    travel_type: { type: String }, // Solo, Couple, Family, Group
    // Step 4
    budget_range: { type: String },
    package_type: { type: String }, // Budget, Standard, Luxury
    // Step 5
    hotel_category: { type: String }, // 3 Star, 4 Star, 5 Star, Resort
    transport: { type: String }, // Cab, Bus, Train, Flight
    // Step 6
    activities: [{ type: String }],
    food_pref: { type: String },
    special_requests: { type: String },
    // Step 7/8
    estimated_price: { type: Number },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    payment_status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Trip', TripSchema);
