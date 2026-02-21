import AuthService from '../../services/auth.service.js';
import UserRepository from '../../repositories/user.repository.js';
import OtpRepository from '../../repositories/otp.repository.js';
import EmailService from '../../services/email.service.js';
import AppError from '../../utils/appError.js';

jest.mock('../../repositories/user.repository.js');
jest.mock('../../repositories/otp.repository.js');
jest.mock('../../services/email.service.js');
jest.mock('mongoose', () => ({
  default: {
    startSession: jest.fn(() => ({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    })),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      UserRepository.findOne.mockResolvedValue(null);
      UserRepository.create.mockResolvedValue([{ _id: 'user123', email: 'test@example.com' }]);
      OtpRepository.create.mockResolvedValue({});
      EmailService.sendOtpEmail.mockResolvedValue(true);

      const result = await AuthService.register({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        registrationNumber: 'REG123',
        mobileNumber: '1234567890',
      });

      expect(result.message).toContain('Registration successful');
      expect(UserRepository.create).toHaveBeenCalled();
      expect(EmailService.sendOtpEmail).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      UserRepository.findOne.mockResolvedValue({ email: 'test@example.com' });

      await expect(
        AuthService.register({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          registrationNumber: 'REG123',
          mobileNumber: '1234567890',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        isVerified: true,
        isCurrentlyBanned: jest.fn().mockReturnValue(false),
        comparePassword: jest.fn().mockResolvedValue(true),
        role: 'user',
      };

      UserRepository.findOne.mockResolvedValue(mockUser);

      const result = await AuthService.login('test@example.com', 'password123');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      UserRepository.findOne.mockResolvedValue(null);

      await expect(
        AuthService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow(AppError);
    });
  });
});
