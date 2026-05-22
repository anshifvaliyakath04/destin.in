const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Import Models
const User = require('./models/User');
const Trip = require('./models/Trip');
const Setting = require('./models/Setting');

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
// Email Configuration
// ---------------------------------------------------------
let transporter;
const initEmail = async () => {
    try {
        let emailUser = process.env.EMAIL_USER;
        let emailPass = process.env.EMAIL_PASS;
        
        // Try getting from DB Settings
        const settings = await Setting.findOne();
        if (settings && settings.email_user && settings.email_pass) {
            emailUser = settings.email_user;
            emailPass = settings.email_pass;
        }

        if (emailUser && emailPass) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailUser,
                    pass: emailPass
                }
            });
            console.log(`Email Service: Real Gmail Transport configured for "${emailUser}"`);
        } else {
            console.log('No EMAIL_USER and EMAIL_PASS found in DB or .env.');
            console.log('Attempting to configure Nodemailer Ethereal SMTP account for testing...');
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            console.log('✅ Nodemailer Ethereal SMTP test account successfully generated!');
            console.log(`   - Username: ${testAccount.user}`);
            console.log('   - Emails will generate preview URLs in the server console.');
        }
    } catch (err) {
        console.error('❌ Failed to initialize email:', err);
    }
};
initEmail();

const getEmailSenderConfig = async () => {
    let fromName = 'Destin.in Tours';
    let fromEmail = process.env.EMAIL_USER || 'admin@destin.in';

    try {
        const settings = await Setting.findOne();
        if (settings) {
            if (settings.email_user) {
                fromEmail = settings.email_user;
            }
            if (settings.email_from_name) {
                fromName = settings.email_from_name;
            }
        }
    } catch (err) {}

    return {
        from: `"${fromName}" <${fromEmail}>`,
        replyTo: fromEmail
    };
};

const sendConfirmationEmail = async (email, name, destination, status, trip = null, reason = '') => {
    if (!transporter) {
        console.warn('⚠️ Mail transport not configured. Skipping confirmation email.');
        return;
    }
    
    let subject, htmlContent;

    if (status === 'Approved') {
        subject = 'Your Trip Booking Has Been Confirmed – Destin.in';
        
        let tripId = 'N/A';
        let tripDuration = 'N/A';
        let startDateStr = 'N/A';
        let endDateStr = 'N/A';
        let travelersStr = 'N/A';

        if (trip) {
            tripId = trip._id ? trip._id.toString() : 'N/A';
            tripDuration = trip.duration || 'N/A';
            
            // Format Journey Start Date
            if (trip.start_date) {
                try {
                    const startDate = new Date(trip.start_date);
                    if (!isNaN(startDate.getTime())) {
                        const options = { day: '2-digit', month: 'long', year: 'numeric' };
                        startDateStr = startDate.toLocaleDateString('en-US', options);
                        
                        // Format Journey End Date based on duration
                        let days = 1;
                        const daysMatch = trip.duration && trip.duration.match(/(\d+)\s*Day/i);
                        if (daysMatch) {
                            days = parseInt(daysMatch[1], 10);
                        }
                        const endDate = new Date(startDate);
                        endDate.setDate(startDate.getDate() + (days - 1));
                        endDateStr = endDate.toLocaleDateString('en-US', options);
                    } else {
                        startDateStr = trip.start_date;
                    }
                } catch (e) {
                    startDateStr = trip.start_date;
                }
            }

            // Format Travelers
            const adultsCount = trip.adults || 0;
            const childrenCount = trip.children || 0;
            travelersStr = `${adultsCount} Adult${adultsCount !== 1 ? 's' : ''}`;
            if (childrenCount > 0) {
                travelersStr += `, ${childrenCount} Child${childrenCount !== 1 ? 'ren' : ''}`;
            }
        }

        htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #eee; border-radius: 12px; line-height: 1.6; color: #333;">
                <p style="margin-top: 0;">Dear <b>${name}</b>,</p>
                <p>Greetings from Destin.in! 🌍</p>
                <p>We are delighted to inform you that your trip booking has been successfully confirmed. Thank you for choosing us to plan your journey.</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2ecc71;">
                    <h3 style="margin-top: 0; color: #2ecc71; border-bottom: 1px solid #ddd; padding-bottom: 8px; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.5px;">Trip Details</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                        <tr>
                            <td style="padding: 6px 0; font-weight: bold; color: #555; width: 40%;">Booking ID:</td>
                            <td style="padding: 6px 0; color: #111;">#${tripId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: bold; color: #555;">Destination(s):</td>
                            <td style="padding: 6px 0; color: #111;">${destination}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: bold; color: #555;">Number of Travelers:</td>
                            <td style="padding: 6px 0; color: #111;">${travelersStr}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: bold; color: #555;">Journey Start Date:</td>
                            <td style="padding: 6px 0; color: #111;">${startDateStr}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: bold; color: #555;">Journey End Date:</td>
                            <td style="padding: 6px 0; color: #111;">${endDateStr}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: bold; color: #555;">Trip Duration:</td>
                            <td style="padding: 6px 0; color: #111;">${tripDuration}</td>
                        </tr>
                    </table>
                </div>
                
                <p>Thank you once again for booking with Destin.in.</p>
                <p>We look forward to making your trip memorable and comfortable.</p>
                
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.95rem; color: #555;">
                    <p style="margin: 0; font-weight: bold; color: #333;">Warm regards,</p>
                    <p style="margin: 4px 0 0 0; font-weight: bold; color: #2ecc71;">Team Destin.in</p>
                    <p style="margin: 6px 0 0 0;">📧 <a href="mailto:info@destin.in" style="color: #3498db; text-decoration: none;">info@destin.in</a></p>
                    <p style="margin: 4px 0 0 0;">📞 +91 7356821364</p>
                </div>
            </div>
        `;
    } else if (status === 'Rejected') {
        subject = 'Trip Booking Update – Destin.in';
        const reasonHtml = reason ? `<div style="background-color: #fff5f5; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0;"><p style="margin: 0; font-size: 0.95rem; color: #333; font-style: italic;"><b>Reason for rejection:</b><br>"${reason}"</p></div>` : '';
        htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #eee; border-radius: 12px; line-height: 1.6; color: #333;">
                <p style="margin-top: 0;">Dear <b>${name}</b>,</p>
                <p>Greetings from Destin.in.</p>
                <p>Thank you for choosing us for your travel planning. After reviewing your booking request, we regret to inform you that we are unable to process your booking request for <b>${destination}</b> at this time.</p>
                ${reasonHtml}
                <p>We sincerely apologize for the inconvenience caused and appreciate your understanding. We hope to serve you on your future trips with Destin.in.</p>
                
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.95rem; color: #555;">
                    <p style="margin: 0; font-weight: bold; color: #333;">Warm regards,</p>
                    <p style="margin: 4px 0 0 0; font-weight: bold; color: #e74c3c;">Team Destin.in</p>
                    <p style="margin: 6px 0 0 0;">📧 <a href="mailto:info@destin.in" style="color: #3498db; text-decoration: none;">info@destin.in</a></p>
                    <p style="margin: 4px 0 0 0;">📞 +91 7356821364</p>
                </div>
            </div>
        `;
    } else {
        return;
    }

    try {
        const senderConfig = await getEmailSenderConfig();
        
        const info = await transporter.sendMail({
            from: senderConfig.from,
            replyTo: senderConfig.replyTo,
            to: email,
            subject: subject,
            html: htmlContent
        });
        
        console.log(`✅ Confirmation email sent to ${email} (Status: ${status})`);
        
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`📧 Preview Test Email at Ethereal: ${previewUrl}`);
        }
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
};

const sendAdminNotificationEmail = async (trip) => {
    if (!transporter) return;

    try {
        const settings = await Setting.findOne();
        let adminEmail = process.env.EMAIL_USER || 'admin@destin.in';
        if (settings && settings.email_user) {
            adminEmail = settings.email_user;
        }

        const senderConfig = await getEmailSenderConfig();
        
        const destNames = Array.isArray(trip.destinations) ? trip.destinations.join(', ') : (trip.destinations || 'N/A');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 1rem;">
                <h2>New Tour Booking Alert!</h2>
                <p>A new tour package request has been submitted.</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 6px 0; font-weight: bold; width: 40%;">Customer Name:</td><td>${trip.customer_name}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Email:</td><td>${trip.customer_email}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Phone:</td><td>${trip.customer_phone}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Destination(s):</td><td>${destNames}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Start Date:</td><td>${trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'N/A'}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Duration:</td><td>${trip.duration}</td></tr>
                </table>
                <p style="margin-top: 1rem;"><a href="${process.env.BASE_URL || 'http://localhost:5000'}/admin.html" style="background: #3498db; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 5px;">View in Admin Dashboard</a></p>
            </div>
        `;

        await transporter.sendMail({
            from: senderConfig.from,
            replyTo: senderConfig.replyTo,
            to: adminEmail,
            subject: `🚨 New Booking Alert: ${trip.customer_name} - ${destNames}`,
            html: htmlContent
        });
        
        console.log(`✅ Admin Notification Email sent to ${adminEmail}`);
    } catch (error) {
        console.error('❌ Error sending admin notification email:', error);
    }
};


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

const optionalVerifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return next();
    
    const tokenPart = token.split(' ')[1] || token;
    if (!tokenPart || tokenPart === 'null' || tokenPart === 'undefined') {
        return next();
    }
    
    jwt.verify(tokenPart, JWT_SECRET, (err, decoded) => {
        if (err) {
            return next();
        }
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
        const { name, email, password, phone, whatsapp, address } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

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
            phone,
            whatsapp,
            address,
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
// Forgot Password — Send OTP
// ---------------------------------------------------------
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required.' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'No account found with this email address.' });

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.reset_otp = otp;
        user.reset_otp_expiry = expiry;
        await user.save();

        // Send OTP email using the existing transporter
        if (!transporter) {
            console.warn('⚠️ Mail transporter not ready. OTP saved but email not sent.');
            // Still return OTP in dev mode via console so you can test
            console.log(`[DEV] OTP for ${email}: ${otp}`);
            return res.status(200).json({ message: 'OTP generated (check server console). Email service not configured.' });
        }

        const senderConfig = await getEmailSenderConfig();

        await transporter.sendMail({
            from: senderConfig.from,
            replyTo: senderConfig.replyTo,
            to: email,
            subject: '🔐 Your Destin.in Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 2rem; background: #f9f9f9; border-radius: 10px;">
                    <h2 style="color: #173D2F; text-align:center;">Destin.in</h2>
                    <h3 style="text-align:center; color:#333;">Password Reset Request</h3>
                    <p style="color:#555;">Hi <strong>${user.name}</strong>,</p>
                    <p style="color:#555;">Use the OTP below to reset your password. It is valid for <strong>10 minutes</strong>.</p>
                    <div style="text-align:center; margin: 2rem 0;">
                        <span style="font-size: 2.5rem; font-weight: bold; letter-spacing: 10px; color: #173D2F; background: #e8f4ef; padding: 1rem 2rem; border-radius: 10px;">${otp}</span>
                    </div>
                    <p style="color:#888; font-size:0.85rem; text-align:center;">If you did not request this, please ignore this email.</p>
                </div>
            `
        });

        console.log(`✅ OTP email sent to ${email}`);
        res.status(200).json({ message: 'OTP sent to your email address. Check your inbox.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }
});

// ---------------------------------------------------------
// Verify OTP Only (Step 4 — without resetting password)
// ---------------------------------------------------------
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'No account found with this email.' });

        if (!user.reset_otp || user.reset_otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
        }
        if (!user.reset_otp_expiry || new Date() > user.reset_otp_expiry) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        res.status(200).json({ message: 'OTP verified successfully.' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Server error during OTP verification.' });
    }
});

// ---------------------------------------------------------
// Reset Password — Verify OTP & Set New Password
// ---------------------------------------------------------
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Email, OTP, and new password are all required.' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'No account found with this email.' });

        // Check OTP validity
        if (!user.reset_otp || user.reset_otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
        }
        if (!user.reset_otp_expiry || new Date() > user.reset_otp_expiry) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Hash new password and clear OTP
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(newPassword, salt);
        user.reset_otp = undefined;
        user.reset_otp_expiry = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully! You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error during password reset.' });
    }
});

// ---------------------------------------------------------
// Trip Routes
// ---------------------------------------------------------
app.post('/api/trips', optionalVerifyToken, async (req, res) => {
    try {
        const { 
            customer_name, customer_phone, customer_whatsapp, 
            customer_email, customer_address, pickup_location,
            destinations, start_date, duration, 
            adults, children, travel_type, 
            budget_range, package_type, 
            hotel_category, transport, 
            activities, food_pref, special_requests, estimated_price
        } = req.body;

        // Auto-link registered user if they aren't logged in but their email is registered
        let linkedUserId = req.userId || null;
        if (!linkedUserId && customer_email) {
            const matchedUser = await User.findOne({ email: customer_email.toLowerCase().trim() });
            if (matchedUser) {
                linkedUserId = matchedUser._id;
            }
        }
        
        const newTrip = new Trip({
            user_id: linkedUserId,
            customer_name,
            customer_phone,
            customer_whatsapp,
            customer_email,
            customer_address,
            pickup_location,
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
        
        // Notify the Admin
        sendAdminNotificationEmail(newTrip);

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
            phone: u.phone,
            whatsapp: u.whatsapp,
            address: u.address,
            role: u.role,
            created_at: u.createdAt
        }));
        res.status(200).json(formattedUsers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/admin/users', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { name, email, password, phone, whatsapp, address, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

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
            phone,
            whatsapp,
            address,
            password_hash: passwordHash,
            role: role || 'user'
        });
        await newUser.save();
        
        res.status(201).json({ 
            message: 'User created successfully!',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                created_at: newUser.createdAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during user creation' });
    }
});

app.delete('/api/admin/users/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (req.userId === id) {
            return res.status(400).json({ error: 'You cannot delete your own admin account.' });
        }

        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Prevent deleting seed admin
        if (userToDelete.email === process.env.ADMIN_EMAIL) {
            return res.status(400).json({ error: 'The primary system admin account cannot be deleted.' });
        }

        await User.findByIdAndDelete(id);
        res.status(200).json({ message: 'User deleted successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});


// Change Admin Credentials
app.put('/api/admin/change-credentials', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { currentPassword, newEmail, newPassword } = req.body;

        if (!currentPassword) {
            return res.status(400).json({ error: 'Current password is required.' });
        }
        if (!newEmail && !newPassword) {
            return res.status(400).json({ error: 'Provide a new email or new password to update.' });
        }

        // Fetch the currently logged-in admin
        const admin = await User.findById(req.userId);
        if (!admin) return res.status(404).json({ error: 'Admin account not found.' });

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        // Check if new email is already taken by another user
        if (newEmail && newEmail !== admin.email) {
            const emailExists = await User.findOne({ email: newEmail });
            if (emailExists) {
                return res.status(400).json({ error: 'This email is already in use by another account.' });
            }
            admin.email = newEmail;
        }

        // Hash and update new password
        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            admin.password_hash = await bcrypt.hash(newPassword, salt);
        }

        await admin.save();
        res.status(200).json({ message: 'Admin credentials updated successfully.' });

    } catch (error) {
        console.error('Error changing credentials:', error);
        res.status(500).json({ error: 'Server error while changing credentials.' });
    }
});


app.get('/api/admin/trips', [verifyToken, isAdmin], async (req, res) => {
    try {
        const trips = await Trip.find().populate('user_id', 'name email').sort({ createdAt: -1 });
        // Format to match frontend rendering
        const formattedTrips = trips.map(t => ({
            id: t._id,
            user_name: t.customer_name || (t.user_id ? t.user_id.name : 'Guest User'),
            user_email: t.customer_email || (t.user_id ? t.user_id.email : 'Guest Email'),
            user_phone: t.customer_phone || '',
            user_whatsapp: t.customer_whatsapp || '',
            user_address: t.customer_address || '',
            pickup_location: t.pickup_location || '',
            destinations: t.destinations ? t.destinations.join(', ') : '',
            duration: t.duration,
            adults: t.adults,
            children: t.children,
            travel_type: t.travel_type,
            package_type: t.package_type,
            estimated_price: t.estimated_price,
            status: t.status,
            payment_status: t.payment_status,
            created_at: t.createdAt
        }));
        res.status(200).json(formattedTrips);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all trips' });
    }
});

app.get('/api/admin/stats', [verifyToken, isAdmin], async (req, res) => {
    try {
        const trips = await Trip.find();
        
        const totalBookings = trips.length;
        const pendingApprovals = trips.filter(t => t.status === 'Pending').length;
        
        let totalRevenue = 0;
        let upcomingTrips = 0;
        
        trips.forEach(t => {
            if (t.status === 'Approved') {
                totalRevenue += (t.estimated_price || 0);
                upcomingTrips++;
            }
        });

        res.status(200).json({
            totalBookings,
            totalRevenue,
            pendingApprovals,
            upcomingTrips
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.put('/api/admin/trips/:id/status', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        
        if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const trip = await Trip.findByIdAndUpdate(id, { status }, { new: true }).populate('user_id', 'name email');
        if (!trip) return res.status(404).json({ error: 'Trip not found' });
        
        // Send Email Notification
        const recipientEmail = trip.customer_email || (trip.user_id ? trip.user_id.email : null);
        const recipientName = trip.customer_name || (trip.user_id ? trip.user_id.name : 'Valued Customer');
        
        if (recipientEmail && (status === 'Approved' || status === 'Rejected')) {
            const destName = trip.destinations && trip.destinations.length > 0 ? trip.destinations.join(', ') : 'your destination';
            sendConfirmationEmail(recipientEmail, recipientName, destName, status, trip, reason);
        }

        res.status(200).json({ message: 'Status updated successfully', trip });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

app.put('/api/admin/trips/:id/payment', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_status } = req.body;
        
        if (!['Pending', 'Paid'].includes(payment_status)) {
            return res.status(400).json({ error: 'Invalid payment status' });
        }

        const trip = await Trip.findByIdAndUpdate(id, { payment_status }, { new: true });
        if (!trip) return res.status(404).json({ error: 'Trip not found' });

        res.status(200).json({ message: 'Payment status updated successfully', trip });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

app.post('/api/admin/trips', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { 
            customer_name, customer_phone, customer_whatsapp, customer_email, customer_address,
            destinations, start_date, duration, 
            adults, children, travel_type, food_pref, 
            special_requests, status, payment_status 
        } = req.body;

        if (!customer_name || !customer_phone || !customer_email) {
            return res.status(400).json({ error: 'Customer Name, Phone, and Email are required.' });
        }

        // Auto-link registered user if their email matches
        let linkedUserId = null;
        if (customer_email) {
            const matchedUser = await User.findOne({ email: customer_email.toLowerCase().trim() });
            if (matchedUser) {
                linkedUserId = matchedUser._id;
            }
        }

        const newTrip = new Trip({
            user_id: linkedUserId,
            customer_name,
            customer_phone,
            customer_whatsapp,
            customer_email,
            customer_address,
            destinations: Array.isArray(destinations) ? destinations : (destinations ? [destinations] : []),
            start_date,
            duration: duration || '3 Nights / 4 Days',
            adults: adults || 1,
            children: children || 0,
            travel_type: travel_type || 'Couple',
            food_pref: food_pref || 'Any',
            special_requests: special_requests || '',
            status: status || 'Pending',
            payment_status: payment_status || 'Pending'
        });

        await newTrip.save();
        res.status(201).json({ message: 'Trip booking created successfully!', trip: newTrip });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during trip booking creation' });
    }
});

app.delete('/api/admin/trips/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTrip = await Trip.findByIdAndDelete(id);
        if (!deletedTrip) {
            return res.status(404).json({ error: 'Trip booking not found.' });
        }
        res.status(200).json({ message: 'Trip booking deleted successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete trip booking.' });
    }
});

// ---------------------------------------------------------
// Testimonial Routes & Multer config
// ---------------------------------------------------------
const multer = require('multer');
const fs = require('fs');
const Testimonial = require('./models/Testimonial');

const uploadDir = path.join(__dirname, 'public', 'uploads', 'testimonials');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.get('/api/testimonials', async (req, res) => {
    try {
        const testimonials = await Testimonial.find({ status: 'Approved' }).sort({ createdAt: -1 });
        res.status(200).json(testimonials);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
});

app.post('/api/testimonials', upload.array('images', 5), async (req, res) => {
    try {
        const { name, trip_type, rating, review_text } = req.body;
        
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => '/uploads/testimonials/' + file.filename);
        }

        const newTestimonial = new Testimonial({
            name,
            trip_type,
            rating: Number(rating),
            review_text,
            images
        });

        await newTestimonial.save();
        res.status(201).json({ message: 'Testimonial submitted successfully!', testimonial: newTestimonial });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit testimonial' });
    }
});

app.put('/api/testimonials/:id', upload.array('images', 5), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, trip_type, rating, review_text } = req.body;
        
        const testimonial = await Testimonial.findById(id);
        if (!testimonial) return res.status(404).json({ error: 'Testimonial not found' });

        // Check if within 60 seconds of creation
        const ageInSeconds = (Date.now() - new Date(testimonial.createdAt).getTime()) / 1000;
        if (ageInSeconds > 60) {
            return res.status(403).json({ error: 'Edit time window (1 minute) has expired.' });
        }

        testimonial.name = name;
        testimonial.trip_type = trip_type;
        testimonial.rating = Number(rating);
        testimonial.review_text = review_text;

        if (req.files && req.files.length > 0) {
            testimonial.images = req.files.map(file => '/uploads/testimonials/' + file.filename);
        }

        await testimonial.save();
        res.status(200).json({ message: 'Testimonial updated successfully!', testimonial });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update testimonial' });
    }
});

app.get('/api/admin/testimonials', [verifyToken, isAdmin], async (req, res) => {
    try {
        const testimonials = await Testimonial.find().sort({ createdAt: -1 });
        res.status(200).json(testimonials);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
});

app.delete('/api/admin/testimonials/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTestimonial = await Testimonial.findByIdAndDelete(id);
        if (!deletedTestimonial) {
            return res.status(404).json({ error: 'Testimonial not found.' });
        }
        res.status(200).json({ message: 'Testimonial deleted successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete testimonial.' });
    }
});

// ---------------------------------------------------------
// Settings Routes
// ---------------------------------------------------------

app.get('/api/settings', async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({});
        }
        res.status(200).json({ whatsapp_number: settings.whatsapp_number });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch public settings' });
    }
});

app.get('/api/admin/settings', [verifyToken, isAdmin], async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({});
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin settings' });
    }
});

app.put('/api/admin/settings', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { whatsapp_number, email_user, email_pass, email_from_name, email_from_address, admin_notification_email } = req.body;
        let settings = await Setting.findOne();
        if (!settings) {
            settings = new Setting();
        }
        if (whatsapp_number !== undefined) settings.whatsapp_number = whatsapp_number;
        if (email_user !== undefined) settings.email_user = email_user;
        if (email_pass) settings.email_pass = email_pass;
        if (email_from_name !== undefined) settings.email_from_name = email_from_name;
        if (email_from_address !== undefined) settings.email_from_address = email_from_address;
        if (admin_notification_email !== undefined) settings.admin_notification_email = admin_notification_email;
        
        await settings.save();
        
        // Re-initialize email service
        await initEmail();

        res.status(200).json({ message: 'Settings updated successfully!', settings });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ---------------------------------------------------------
// Utility: Create Default Admin
// ---------------------------------------------------------
const createDefaultAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@destin.in';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

        const adminExists = await User.findOne({ email: adminEmail });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(adminPassword, salt);
            await User.create({
                name: 'Admin',
                email: adminEmail,
                password_hash: passwordHash,
                role: 'admin'
            });
            console.log(`✅ Default admin created (${adminEmail})`);
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
app.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const nets = os.networkInterfaces();
    let localIP = 'localhost';
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
        }
    }
    console.log(`\n✅  Server running!`);
    console.log(`   💻  Local  : http://localhost:${PORT}`);
    console.log(`   📱  Mobile : http://${localIP}:${PORT}  (connect phone to same WiFi)\n`);
});
