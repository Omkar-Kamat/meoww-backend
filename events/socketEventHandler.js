import eventBus from './eventBus.js';
import { getIO } from '../sockets/socket.server.js';
import { logger } from '../utils/appError.js';

export const initSocketEventHandlers = () => {
  // Match events
  eventBus.on('match:found', ({ userA, userB, sessionId }) => {
    try {
      const io = getIO();
      io.to(userA).emit('matchFound', { sessionId, partnerId: userB });
      io.to(userB).emit('matchFound', { sessionId, partnerId: userA });
    } catch (error) {
      logger.error('Socket emit error: match:found', { error: error.message });
    }
  });

  eventBus.on('match:ended', ({ sessionId, partnerId }) => {
    try {
      const io = getIO();
      io.to(partnerId).emit('matchEnded', { sessionId });
    } catch (error) {
      logger.error('Socket emit error: match:ended', { error: error.message });
    }
  });

  eventBus.on('match:skipped', ({ sessionId, partnerId }) => {
    try {
      const io = getIO();
      io.to(partnerId).emit('matchEnded', { sessionId });
    } catch (error) {
      logger.error('Socket emit error: match:skipped', { error: error.message });
    }
  });

  // Session events
  eventBus.on('session:resumed', ({ sessionId, partnerId }) => {
    try {
      const io = getIO();
      io.to(partnerId).emit('sessionResumed', { sessionId });
    } catch (error) {
      logger.error('Socket emit error: session:resumed', { error: error.message });
    }
  });

  eventBus.on('partner:disconnected', ({ sessionId, partnerId, graceSeconds }) => {
    try {
      const io = getIO();
      io.to(partnerId).emit('partnerDisconnected', { sessionId, graceSeconds });
    } catch (error) {
      logger.error('Socket emit error: partner:disconnected', { error: error.message });
    }
  });

  // Signaling events
  eventBus.on('signaling:offer', ({ partnerId, sessionId, offer }) => {
    try {
      const io = getIO();
      io.to(partnerId).emit('offer', { sessionId, offer });
    } catch (error) {
      logger.error('Socket emit error: signaling:offer', { error: error.message });
    }
  });

  eventBus.on('signaling:answer', ({ partnerId, sessionId, answer }) => {
    try {
      const io = getIO();
      io.to(partnerId).emit('answer', { sessionId, answer });
    } catch (error) {
      logger.error('Socket emit error: signaling:answer', { error: error.message });
    }
  });

  eventBus.on('signaling:ice-candidate', ({ partnerId, sessionId, candidate }) => {
    try {
      const io = getIO();
      io.to(partnerId).emit('ice-candidate', { sessionId, candidate });
    } catch (error) {
      logger.error('Socket emit error: signaling:ice-candidate', { error: error.message });
    }
  });

  eventBus.on('signaling:connection-state', ({ partnerId, sessionId, state }) => {
    try {
      const io = getIO();
      io.to(partnerId).emit('partner-connection-state', { sessionId, state });
    } catch (error) {
      logger.error('Socket emit error: signaling:connection-state', { error: error.message });
    }
  });

  eventBus.on('signaling:ice-restart', ({ partnerId, sessionId }) => {
    try {
      const io = getIO();
      io.to(partnerId).emit('ice-restart-request', { sessionId });
    } catch (error) {
      logger.error('Socket emit error: signaling:ice-restart', { error: error.message });
    }
  });

  logger.info('Socket event handlers initialized');
};
