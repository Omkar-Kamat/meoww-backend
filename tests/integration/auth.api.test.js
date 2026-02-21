import request from 'supertest';
import app from '../../app.js';
import mongoose from 'mongoose';
import { connectDB } from '../../config/db.js';
import User from '../../models/User.js';

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          registrationNumber: 'REG123',
          mobileNumber: '1234567890',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Registration successful');
    });

    it('should reject duplicate email', async () => {
      await User.create({
        fullName: 'Existing User',
        email: 'test@example.com',
        password: 'Password123!',
        registrationNumber: 'REG123',
        mobileNumber: '1234567890',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          registrationNumber: 'REG456',
          mobileNumber: '0987654321',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = await User.create({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        registrationNumber: 'REG123',
        mobileNumber: '1234567890',
        isVerified: true,
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });
  });
});
