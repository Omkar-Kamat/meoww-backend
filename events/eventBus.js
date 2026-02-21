import EventEmitter from 'eventemitter3';
import { logger } from '../utils/appError.js';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.on('error', (error) => {
      logger.error('EventBus error', { error: error.message });
    });
  }

  // Match events
  emitMatchFound(userA, userB, sessionId) {
    this.emit('match:found', { userA, userB, sessionId });
  }

  emitMatchEnded(sessionId, userId, partnerId) {
    this.emit('match:ended', { sessionId, userId, partnerId });
  }

  emitMatchSkipped(sessionId, userId, partnerId) {
    this.emit('match:skipped', { sessionId, userId, partnerId });
  }

  // Session events
  emitSessionResumed(sessionId, userId, partnerId) {
    this.emit('session:resumed', { sessionId, userId, partnerId });
  }

  emitPartnerDisconnected(sessionId, userId, partnerId, graceSeconds) {
    this.emit('partner:disconnected', { sessionId, userId, partnerId, graceSeconds });
  }

  // Signaling events
  emitOffer(sessionId, userId, partnerId, offer) {
    this.emit('signaling:offer', { sessionId, userId, partnerId, offer });
  }

  emitAnswer(sessionId, userId, partnerId, answer) {
    this.emit('signaling:answer', { sessionId, userId, partnerId, answer });
  }

  emitIceCandidate(sessionId, userId, partnerId, candidate) {
    this.emit('signaling:ice-candidate', { sessionId, userId, partnerId, candidate });
  }

  emitConnectionState(sessionId, userId, partnerId, state) {
    this.emit('signaling:connection-state', { sessionId, userId, partnerId, state });
  }

  emitIceRestart(sessionId, userId, partnerId) {
    this.emit('signaling:ice-restart', { sessionId, userId, partnerId });
  }
}

export default new EventBus();
