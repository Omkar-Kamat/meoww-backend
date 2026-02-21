import MatchService from '../../services/match.service.js';
import MatchSessionRepository from '../../repositories/matchSession.repository.js';
import UserRepository from '../../repositories/user.repository.js';
import matchQueue from '../../services/matchQueue.service.js';
import AppError from '../../utils/appError.js';

jest.mock('../../repositories/matchSession.repository.js');
jest.mock('../../repositories/user.repository.js');
jest.mock('../../services/matchQueue.service.js');
jest.mock('../../sockets/socket.server.js', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  })),
}));
jest.mock('../../config/redis.js', () => ({
  getRedis: jest.fn(() => ({
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  })),
}));

describe('MatchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should add user to queue when no match available', async () => {
      MatchSessionRepository.findOne.mockResolvedValue(null);
      UserRepository.findById.mockResolvedValue({
        _id: 'user123',
        isCurrentlyBanned: jest.fn().mockReturnValue(false),
      });
      matchQueue.add.mockResolvedValue(true);
      matchQueue.popTwo.mockResolvedValue(null);

      const result = await MatchService.start('user123');

      expect(result.waiting).toBe(true);
      expect(matchQueue.add).toHaveBeenCalledWith('user123');
    });

    it('should create match when two users available', async () => {
      MatchSessionRepository.findOne.mockResolvedValue(null);
      UserRepository.findById.mockResolvedValue({
        _id: 'user123',
        isCurrentlyBanned: jest.fn().mockReturnValue(false),
      });
      matchQueue.add.mockResolvedValue(true);
      matchQueue.popTwo.mockResolvedValue(['user123', 'user456']);
      MatchSessionRepository.create.mockResolvedValue({
        _id: 'session123',
        userA: 'user123',
        userB: 'user456',
      });

      const result = await MatchService.start('user123');

      expect(result.matched).toBe(true);
      expect(result.sessionId).toBe('session123');
    });

    it('should throw error if user is banned', async () => {
      MatchSessionRepository.findOne.mockResolvedValue(null);
      UserRepository.findById.mockResolvedValue({
        _id: 'user123',
        isCurrentlyBanned: jest.fn().mockReturnValue(true),
      });

      await expect(MatchService.start('user123')).rejects.toThrow(AppError);
    });
  });

  describe('end', () => {
    it('should end active session successfully', async () => {
      const mockSession = {
        _id: 'session123',
        userA: 'user123',
        userB: 'user456',
        status: 'ACTIVE',
      };

      MatchSessionRepository.findOne.mockResolvedValue(mockSession);
      MatchSessionRepository.save.mockResolvedValue(mockSession);
      matchQueue.remove.mockResolvedValue(true);

      const result = await MatchService.end('user123');

      expect(result.message).toContain('Match ended successfully');
      expect(matchQueue.remove).toHaveBeenCalledWith('user123');
    });

    it('should throw error if no active session', async () => {
      MatchSessionRepository.findOne.mockResolvedValue(null);

      await expect(MatchService.end('user123')).rejects.toThrow(AppError);
    });
  });
});
