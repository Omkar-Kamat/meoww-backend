# Meoww Backend Codebase

This file contains the complete source code and configuration for the Meoww backend service, excluding dependencies and environment secrets.

---

## File: [package.json](file:///c:/Users/mail4/Music/meoww/meoww-backend/package.json)
```json
{
  "name": "meoww-backend",
  "version": "1.0.0",
  "description": "",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cloudinary": "^1.41.3",
    "cookie": "^1.1.1",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "express-rate-limit": "^8.2.1",
    "express-validator": "^7.3.1",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^9.2.2",
    "multer": "^2.0.2",
    "multer-storage-cloudinary": "^4.0.0",
    "resend": "^6.9.2",
    "socket.io": "^4.8.3",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.1",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
```

---

## File: [server.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/server.js)
```javascript
import 'dotenv/config';

import http from 'http';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { initSocketServer } from './src/sockets/socket.server.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Connect to Database
connectDB();

// Initialize Socket.io
initSocketServer(server);

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
```

---

## File: [.gitignore](file:///c:/Users/mail4/Music/meoww/meoww-backend/.gitignore)
```text
/node_modules
.env
.env.example
```

---

## File: [README.md](file:///c:/Users/mail4/Music/meoww/meoww-backend/README.md)
```markdown
# 🐾 MEOWW Backend

The backend coordination engine for **Meoww** — a real-time, 1v1 random video chat application.

## 🚀 Teck Stack

- **Server**: Node.js + Express
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.io
- **Auth**: JWT (Double Cookie Strategy) + bcryptjs
- **Services**: Resend (Email), Cloudinary (Images)
- **Security**: Helmet, Express Rate Limit

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)
- Cloudinary Account
- Resend API Key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file in the root directory (refer to `.env.example`).
4. Run the development server:
   ```bash
   npm run dev
   ```

## 📖 API Documentation

The API Documentation is powered by **Swagger**. 

Once the server is running, you can access the interactive documentation at:
🔗 `http://localhost:5000/api-docs`

## 🔌 Socket Events

The signaling server handles the following events:

- `search`: Join the matchmaking queue.
- `offer`: Relay WebRTC offer to peer.
- `answer`: Relay WebRTC answer to peer.
- `ice-candidate`: Relay ICE candidates.
- `skip`: Disconnect from current peer and find a new one.
- `send-message`: Exchange chat messages in-room.

## 📁 Project Structure

```text
meoww-backend/
├── src/
│   ├── config/        # Setup for DB, CORS, Cloudinary, Swagger
│   ├── modules/       # MVC Modules (Auth, User, OTP)
│   ├── sockets/       # Socket.io signaling & matchmaking
│   ├── services/      # External services (Email, TURN)
│   ├── middleware/    # Auth and Rate limiting
│   └── app.js         # Express app config
├── server.js          # Entry point
└── ...
```
```

---

## File: [src/app.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/app.js)
```javascript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import corsOptions from './config/cors.js';
import authRoutes from './modules/auth/auth.routes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

const app = express();

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Security Middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Error Handler
app.use((err, req, res, next) => {
    // Handle Multer-specific errors with proper 400 responses
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }

    // Handle custom file filter error from cloudinary.js
    if (err.message === 'Only image files allowed') {
        return res.status(400).json({ error: 'Only image files are allowed (jpg, jpeg, png, webp).' });
    }

    // All other errors
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
```

---

## File: [src/config/cloudinary.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/config/cloudinary.js)
```javascript
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'meoww/profiles',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
    }
});

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },  // 5MB max
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files allowed'));
        }
        cb(null, true);
    }
});
```

---

## File: [src/config/cors.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/config/cors.js)
```javascript
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};

export default corsOptions;
```

---

## File: [src/config/db.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/config/db.js)
```javascript
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
```

---

## File: [src/config/swagger.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/config/swagger.js)
```javascript
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Meoww API',
            version: '1.0.0',
            description: 'API documentation for Meoww - a 1v1 random video chat application',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'access_token',
                },
            },
        },
    },
    apis: ['./src/modules/**/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
```

---

## File: [src/middleware/auth.middleware.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/middleware/auth.middleware.js)
```javascript
import jwt from 'jsonwebtoken';

export const verifyAccessToken = (req, res, next) => {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
```

---

## File: [src/middleware/rateLimit.middleware.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/middleware/rateLimit.middleware.js)
```javascript
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again in 15 minutes.' }
});

export const resendOtpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many OTP requests, please wait before requesting again.' }
});

export const turnLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many TURN credential requests.' }
});

export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many signup attempts, please try again later.' }
});
```

---

## File: [src/modules/auth/auth.controller.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/modules/auth/auth.controller.js)
```javascript
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import * as authService from './auth.service.js';
import { generateTurnCredentials } from '../../services/turn.service.js';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
};

export const signup = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        const profileImage = req.file ? req.file.path : '';

        const user = await authService.signup(name, username, email, password, profileImage);
        res.status(201).json({ message: 'Signup successful. Please verify your email.', userId: user._id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { user, accessToken, refreshToken } = await authService.login(email, password);

        res.cookie('access_token', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json({ user });
    } catch (error) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
            return res.status(403).json({ error: error.message, code: error.code, userId: error.userId });
        }
        res.status(401).json({ error: error.message });
    }
};

export const verify = async (req, res) => {
    try {
        const { userId, otp } = req.body;
        if (!userId || !otp) return res.status(400).json({ error: 'userId and otp are required' });
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid userId format' });
        }

        const { user, accessToken, refreshToken } = await authService.verify(userId, otp);

        res.cookie('access_token', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json({ user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId is required' });
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid userId format' });
        }

        await authService.resendOtp(userId);
        res.json({ message: 'OTP resent successfully. Please check your email.' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const refresh = async (req, res) => {
    try {
        const oldRefreshToken = req.cookies.refresh_token;
        if (!oldRefreshToken) throw new Error('No refresh token provided');

        const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(oldRefreshToken);

        res.cookie('access_token', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', newRefreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json({ message: 'Token refreshed' });
    } catch (error) {
        res.status(401).json({ error: 'Session expired. Please login again.' });
    }
};

export const logout = async (req, res) => {
    // Derive userId from refresh token — do NOT require valid access token for logout.
    // This ensures logout always works even if access token has expired.
    try {
        const refreshToken = req.cookies.refresh_token;
        if (refreshToken) {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            await authService.logout(decoded.userId);
        }
    } catch (_) {
        // Ignore token errors — always clear cookies regardless
    }

    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    res.json({ message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
    try {
        const user = await authService.getUserProfile(req.user.userId);
        res.json(user);
    } catch (error) {
        res.status(404).json({ error: 'User not found' });
    }
};

export const getTurnCredentials = async (req, res) => {
    try {
        const credentials = generateTurnCredentials(req.user.userId);
        res.json(credentials);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
```

---

## File: [src/modules/auth/auth.routes.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/modules/auth/auth.routes.js)
```javascript
import express from 'express';
import * as authController from './auth.controller.js';
import { upload } from '../../config/cloudinary.js';
import { verifyAccessToken } from '../../middleware/auth.middleware.js';
import { authLimiter, resendOtpLimiter, turnLimiter, signupLimiter } from '../../middleware/rateLimit.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Signup successful
 *       400:
 *         description: User already exists or validation error
 */
router.post('/signup', signupLimiter, upload.single('profilePhoto'), authController.signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified
 */
router.post('/login', authLimiter, authController.login);

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification successful
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/verify', authController.verify);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP to user email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: User not found
 *       429:
 *         description: Too many requests
 */
router.post('/resend-otp', resendOtpLimiter, authController.resendOtp);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh tokens
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       404:
 *         description: User not found
 */
router.get('/me', verifyAccessToken, authController.getMe);

/**
 * @swagger
 * /api/auth/turn-credentials:
 *   get:
 *     summary: Get ephemeral TURN credentials
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: TURN credentials retrieved
 */
router.get('/turn-credentials', verifyAccessToken, turnLimiter, authController.getTurnCredentials);


export default router;
```

---

## File: [src/modules/auth/auth.service.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/modules/auth/auth.service.js)
```javascript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../user/user.model.js';
import OTP from '../otp/otp.model.js';
import * as emailService from '../../services/email.service.js';

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
    );
    const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );
    return { accessToken, refreshToken };
};

export const signup = async (name, username, email, password, profileImage) => {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new Error('Email or Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
        name,
        username,
        email,
        passwordHash,
        profileImage,
        isVerified: false
    });

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        await OTP.create({
            userId: user._id,
            otpHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });
        await emailService.sendOTPEmail(email, otp);
    } catch (error) {
        // Rollback: delete the created user so they can sign up again
        await User.findByIdAndDelete(user._id);
        throw new Error('Failed to send verification email. Please try again.');
    }

    const userObj = user.toObject();
    delete userObj.passwordHash;
    return userObj;
};

export const login = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new Error('Invalid credentials');

    if (!user.isVerified) {
        const error = new Error('Email not verified');
        error.code = 'EMAIL_NOT_VERIFIED';
        error.userId = user._id;
        throw error;
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    user.refreshTokenHash = refreshTokenHash;
    await user.save();

    const userObj = user.toObject();
    delete userObj.passwordHash;
    delete userObj.refreshTokenHash;

    return { user: userObj, accessToken, refreshToken };
};

export const verify = async (userId, otp) => {
    const objectId = new mongoose.Types.ObjectId(userId);

    const otpRecord = await OTP.findOne({ userId: objectId }).sort({ createdAt: -1 });
    if (!otpRecord) throw new Error('OTP not found or expired');
    if (otpRecord.expiresAt < new Date()) throw new Error('OTP expired');

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) throw new Error('Invalid OTP');

    const { accessToken, refreshToken } = generateTokens(userId);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Single save — combine isVerified + refreshTokenHash update
    const user = await User.findByIdAndUpdate(
        objectId,
        { isVerified: true, refreshTokenHash },
        { new: true }
    );

    await OTP.deleteMany({ userId: objectId });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    delete userObj.refreshTokenHash;

    return { user: userObj, accessToken, refreshToken };
};

export const resendOtp = async (userId) => {
    const objectId = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(objectId);
    if (!user) throw new Error('User not found');
    if (user.isVerified) throw new Error('User is already verified');

    // Delete all existing OTPs for this user
    await OTP.deleteMany({ userId: objectId });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    await OTP.create({
        userId: objectId,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await emailService.sendOTPEmail(user.email, otp);
};

export const refresh = async (refreshToken) => {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.refreshTokenHash) throw new Error('Invalid refresh token');

    const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) throw new Error('Token reuse or invalid token');

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    user.refreshTokenHash = newRefreshTokenHash;
    await user.save();

    return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (userId) => {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
};

export const getUserProfile = async (userId) => {
    const user = await User.findById(userId).select('-passwordHash -refreshTokenHash');
    if (!user) throw new Error('User not found');
    return user;
};
```

---

## File: [src/modules/otp/otp.model.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/modules/otp/otp.model.js)
```javascript
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Add TTL index: This auto-deletes expired OTPs from MongoDB
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;
```

---

## File: [src/modules/user/user.model.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/modules/user/user.model.js)
```javascript
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    profileImage: { type: String, default: '' },      // Cloudinary URL
    isVerified: { type: Boolean, default: false },
    refreshTokenHash: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
export default User;
```

---

## File: [src/services/email.service.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/services/email.service.js)
```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (toEmail, otp) => {
    const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: toEmail,
        subject: 'Your Meoww verification code',
        html: `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #1B1A55;">Verify your Meoww account</h2>
                <p>Your one-time code is:</p>
                <h1 style="letter-spacing: 8px; color: #535C91; font-size: 36px;">${otp}</h1>
                <p style="color: #888; font-size: 13px;">This code expires in 10 minutes. Do not share it.</p>
            </div>
        `
    });

    if (error) {
        throw new Error(`Failed to send OTP email: ${error.message}`);
    }

    return data;
};
```

---

## File: [src/services/turn.service.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/services/turn.service.js)
```javascript
import crypto from 'crypto';

export const generateTurnCredentials = (userId) => {
    if (!process.env.TURN_SECRET) {
        throw new Error('TURN_SECRET environment variable is not set');
    }
    if (!process.env.TURN_SERVER_URL) {
        throw new Error('TURN_SERVER_URL environment variable is not set');
    }

    const timestamp = Math.floor(Date.now() / 1000) + 3600;
    const username = `${timestamp}:${userId}`;
    const credential = crypto
        .createHmac('sha1', process.env.TURN_SECRET)
        .update(username)
        .digest('base64');

    return {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
                urls: process.env.TURN_SERVER_URL,
                username,
                credential
            }
        ]
    };
};
```

---

## File: [src/sockets/matchmaking.service.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/sockets/matchmaking.service.js)
```javascript
import { v4 as uuidv4 } from 'uuid';

const waitingQueue = new Set();                  // Set of userIds — O(1) lookup
const activeRooms = new Map();                   // roomId → { user1: userId, user2: userId }
const userToRoom = new Map();                    // userId → roomId
const userToSocket = new Map();                  // userId → socket instance

export const handleSearch = (socket, io) => {
    const userId = socket.userId;

    if (userToRoom.has(userId)) return;
    if (waitingQueue.has(userId)) return;

    if (waitingQueue.size === 0) {
        waitingQueue.add(userId);
    } else {
        // Grab the first user from the Set
        const partnerId = waitingQueue.values().next().value;
        waitingQueue.delete(partnerId);

        const roomId = uuidv4();

        activeRooms.set(roomId, { user1: userId, user2: partnerId });
        userToRoom.set(userId, roomId);
        userToRoom.set(partnerId, roomId);

        const initiator = Math.random() > 0.5 ? userId : partnerId;
        const partnerSocket = userToSocket.get(partnerId);

        if (partnerSocket) {
            socket.emit('matched', { roomId, isInitiator: userId === initiator });
            partnerSocket.emit('matched', { roomId, isInitiator: partnerId === initiator });
        } else {
            // Partner disconnected while in queue — clean up and re-queue this user
            userToRoom.delete(userId);
            userToRoom.delete(partnerId);
            activeRooms.delete(roomId);
            waitingQueue.add(userId);
        }
    }
};

const getPeerId = (roomId, userId) => {
    const room = activeRooms.get(roomId);
    if (!room) return null;
    return room.user1 === userId ? room.user2 : room.user1;
};

export const handleOffer = (socket, { offer }) => {
    const roomId = userToRoom.get(socket.userId);
    const peerId = getPeerId(roomId, socket.userId);
    const peerSocket = userToSocket.get(peerId);
    if (peerSocket) peerSocket.emit('offer', { offer });
};

export const handleAnswer = (socket, { answer }) => {
    const roomId = userToRoom.get(socket.userId);
    const peerId = getPeerId(roomId, socket.userId);
    const peerSocket = userToSocket.get(peerId);
    if (peerSocket) peerSocket.emit('answer', { answer });
};

export const handleIceCandidate = (socket, { candidate }) => {
    const roomId = userToRoom.get(socket.userId);
    const peerId = getPeerId(roomId, socket.userId);
    const peerSocket = userToSocket.get(peerId);
    if (peerSocket) peerSocket.emit('ice-candidate', { candidate });
};

export const handleSkip = (socket, io) => {
    const roomId = userToRoom.get(socket.userId);
    if (roomId) {
        const peerId = getPeerId(roomId, socket.userId);
        const peerSocket = userToSocket.get(peerId);
        if (peerSocket) peerSocket.emit('peer-disconnected');

        activeRooms.delete(roomId);
        userToRoom.delete(socket.userId);
        if (peerId) userToRoom.delete(peerId);
    }
    handleSearch(socket, io);
};

export const handleMessage = (socket, { text }) => {
    const roomId = userToRoom.get(socket.userId);
    const peerId = getPeerId(roomId, socket.userId);
    const peerSocket = userToSocket.get(peerId);

    if (peerSocket) {
        peerSocket.emit('receive-message', { text, fromSelf: false });
        socket.emit('receive-message', { text, fromSelf: true });
    }
};

export const handleDisconnect = (socket) => {
    // Remove from waiting queue if present
    waitingQueue.delete(socket.userId);

    const roomId = userToRoom.get(socket.userId);
    if (roomId) {
        const peerId = getPeerId(roomId, socket.userId);
        const peerSocket = userToSocket.get(peerId);
        if (peerSocket) peerSocket.emit('peer-disconnected');

        activeRooms.delete(roomId);
        userToRoom.delete(socket.userId);
        if (peerId) userToRoom.delete(peerId);
    }
    userToSocket.delete(socket.userId);
};

export { userToSocket };
```

---

## File: [src/sockets/socket.server.js](file:///c:/Users/mail4/Music/meoww/meoww-backend/src/sockets/socket.server.js)
```javascript
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import * as matchmakingService from './matchmaking.service.js';

export const initSocketServer = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true,
        },
    });

    io.use((socket, next) => {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) return next(new Error('Authentication error: No cookies found'));

        const parsedCookies = cookie.parse(cookies);
        const token = parsedCookies.access_token;

        if (!token) return next(new Error('Authentication error: No access token'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);
        matchmakingService.userToSocket.set(socket.userId, socket);

        socket.on('search', () => matchmakingService.handleSearch(socket, io));
        socket.on('offer', (data) => matchmakingService.handleOffer(socket, data));
        socket.on('answer', (data) => matchmakingService.handleAnswer(socket, data));
        socket.on('ice-candidate', (data) => matchmakingService.handleIceCandidate(socket, data));
        socket.on('skip', () => matchmakingService.handleSkip(socket, io));
        socket.on('send-message', (data) => matchmakingService.handleMessage(socket, data));

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
            matchmakingService.handleDisconnect(socket);
        });
    });

    return io;
};
```
