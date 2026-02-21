process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MONGODB_URI = 'mongodb://localhost:27017/meoww-test';
process.env.FRONTEND_URL = 'http://localhost:3000';

global.beforeAll(() => {
  jest.setTimeout(30000);
});
