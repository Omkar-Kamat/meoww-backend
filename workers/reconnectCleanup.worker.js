import { Worker, Queue } from 'bullmq';
import MatchSessionRepository from '../repositories/matchSession.repository.js';
import ReconnectService from '../services/reconnect.service.js';
import eventBus from '../events/eventBus.js';
import { logger } from '../utils/appError.js';

const connection = {
  host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'localhost',
  port: parseInt(process.env.REDIS_URL?.split(':')[2]) || 6379,
};

export const reconnectCleanupQueue = new Queue('reconnect-cleanup', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

let reconnectWorker;

export const startReconnectCleanupWorker = () => {
  if (reconnectWorker) return reconnectWorker;

  reconnectWorker = new Worker(
    'reconnect-cleanup',
    async (job) => {
      const sessions = await MatchSessionRepository.find({ status: 'ACTIVE' });

      for (const session of sessions) {
        const users = [session.userA.toString(), session.userB.toString()];

        for (const userId of users) {
          const stillInGrace = await ReconnectService.hasReconnectWindow(
            session._id.toString(),
            userId
          );

          if (stillInGrace) continue;

          const wasMarked = await ReconnectService.wasEverMarked(
            session._id.toString(),
            userId
          );

          if (!wasMarked) continue;

          await MatchSessionRepository.save(session);

          const partnerId = session.userA.toString() === userId
            ? session.userB.toString()
            : session.userA.toString();

          eventBus.emitMatchEnded(session._id, userId, partnerId);
          break;
        }
      }
    },
    { connection, concurrency: 1 }
  );

  reconnectWorker.on('completed', (job) => {
    logger.debug('Reconnect cleanup job completed', { jobId: job.id });
  });

  reconnectWorker.on('failed', (job, err) => {
    logger.error('Reconnect cleanup job failed', { jobId: job?.id, error: err.message });
  });

  logger.info('Reconnect cleanup worker started');
  return reconnectWorker;
};

export const scheduleReconnectCleanup = async () => {
  await reconnectCleanupQueue.add(
    'cleanup',
    {},
    { repeat: { pattern: '*/30 * * * * *' } } // Every 30 seconds
  );
};

export const stopReconnectCleanupWorker = async () => {
  if (reconnectWorker) {
    await reconnectWorker.close();
    logger.info('Reconnect cleanup worker stopped');
  }
};
