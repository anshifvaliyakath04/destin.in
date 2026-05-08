const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import Models
const User = require('./models/User');
const Trip = require('./models/Trip');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Environment Variables
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_destin_key_123';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/destin_db';
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------
// MongoDB Connection
// ---------------------------------------------------------
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB successfully!'))
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
        console.log('Ensure you have provided the correct MONGO_URI in your .env file.');
    });

// ---------------------------------------------------------
// Authentication Middleware
// ---------------------------------------------------------
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });
    
    const tokenPart = token.split(' ')[1] || token;
    
    jwt.verify(tokenPart, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized!' });
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Require Admin Role!' });
    }
    next();
};

// ---------------------------------------------------------
// Auth Routes
// ---------------------------------------------------------
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            name,
            email,
            password_hash: passwordHash
        });
        await newUser.save();
        
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const passwordIsValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordIsValid) {
            return res.status(401).json({ token: null, error: 'Invalid Password!' });
        }
        
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
            expiresIn: 86400 // 24 hours
        });
        
        res.status(200).json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            accessToken: token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// ---------------------------------------------------------
// Trip Routes
// ---------------------------------------------------------
app.post('/api/trips', verifyToken, async (req, res) => {
    try {
        const { 
            destinations, start_date, duration, 
            adults, children, travel_type, 
            budget_range, package_type, 
            hotel_category, transport, 
            activities, food_pref, special_requests, estimated_price
        } = req.body;
        
        const newTrip = new Trip({
            user_id: req.userId,
            destinations,
            start_date,
            duration,
            adults,
            children,
            travel_type,
            budget_range,
            package_type,
            hotel_category,
            transport,
            activities,
            food_pref,
            special_requests,
            estimated_price
        });
        
        await newTrip.save();
        res.status(201).json({ message: 'Trip planned and saved successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save trip' });
    }
});

app.get('/api/trips/my', verifyToken, async (req, res) => {
    try {
        const trips = await Trip.find({ user_id: req.userId }).sort({ createdAt: -1 });
        res.status(200).json(trips);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trips' });
    }
});

// ---------------------------------------------------------
// Admin Routes
// ---------------------------------------------------------
app.get('/api/admin/users', [verifyToken, isAdmin], async (req, res) => {
    try {
        const users = await User.find({}, '-password_hash').sort({ createdAt: -1 });
        // Format to match old Sybase format for frontend
        const formattedUsers = users.map(u => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            created_at: u.createdAt
        }));
        res.status(200).json(formattedUsers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/api/admin/trips', [verifyToken, isAdmin], async (req, res) => {
    try {
        const trips = await Trip.find().populate('user_id', 'name email').sort({ createdAt: -1 });
        // Format to match old Sybase format for frontend
        const formattedTrips = trips.map(t => ({
            id: t._id,
            user_name: t.user_id ? t.user_id.name : 'Unknown User',
            user_email: t.user_id ? t.user_id.email : 'Unknown Email',
            destinations: t.destinations ? t.destinations.join(', ') : '',
            duration: t.duration,
            travel_type: t.travel_type,
            package_type: t.package_type,
            estimated_price: t.estimated_price,
            created_at: t.createdAt
        }));
        res.status(200).json(formattedTrips);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all trips' });
    }
});

// ---------------------------------------------------------
// Utility: Create Default Admin
// ---------------------------------------------------------
const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ email: 'admin@destin.in' });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('Admin@123', salt);
            await User.create({
                name: 'Admin',
                email: 'admin@destin.in',
                password_hash: passwordHash,
                role: 'admin'
            });
            console.log('Default admin created (admin@destin.in / Admin@123)');
        }
    } catch (err) {
        console.error('Error creating default admin', err);
    }
};

// Ensure default admin exists after connecting
mongoose.connection.once('open', createDefaultAdmin);

// ---------------------------------------------------------
// Start Server
// ---------------------------------------------------------
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});
