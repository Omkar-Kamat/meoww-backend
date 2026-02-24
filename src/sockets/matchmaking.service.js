class MatchmakingService {
  constructor(io) {
    this.io = io;
    this.waitingQueue = [];
    this.activeRooms = new Map();
    this.userToRoom = new Map();
  }

  addToQueue(socket) {
    if (this.waitingQueue.includes(socket.id)) return;

    this.waitingQueue.push(socket.id);
  }

  removeFromQueue(socketId) {
    this.waitingQueue = this.waitingQueue.filter(
      (id) => id !== socketId
    );
  }

  isInRoom(userId) {
    return this.userToRoom.has(userId);
  }

  createRoom(socket1, socket2) {
    const roomId = `room_${socket1.id}_${socket2.id}`;

    this.activeRooms.set(roomId, {
      users: [socket1.id, socket2.id],
    });

    this.userToRoom.set(socket1.user._id.toString(), roomId);
    this.userToRoom.set(socket2.user._id.toString(), roomId);

    socket1.join(roomId);
    socket2.join(roomId);

    const initiator =
      Math.random() > 0.5 ? socket1.id : socket2.id;

    socket1.emit("matched", {
      peerId: socket2.user._id,
      initiator: socket1.id === initiator,
    });

    socket2.emit("matched", {
      peerId: socket1.user._id,
      initiator: socket2.id === initiator,
    });
  }

  tryMatch(socket) {
    if (this.waitingQueue.length === 0) {
      this.addToQueue(socket);
      return;
    }

    const opponentId = this.waitingQueue.shift();

    const opponentSocket = this.io.sockets.sockets.get(
      opponentId
    );

    if (!opponentSocket) {
      this.tryMatch(socket);
      return;
    }

    this.createRoom(socket, opponentSocket);
  }

  handleSkip(socket) {
    this.cleanupUser(socket);
    this.tryMatch(socket);
  }

  handleDisconnect(socket) {
    this.removeFromQueue(socket.id);
    this.cleanupUser(socket);
  }

  cleanupUser(socket) {
    const roomId = this.userToRoom.get(
      socket.user._id.toString()
    );

    if (!roomId) return;

    const room = this.activeRooms.get(roomId);
    if (!room) return;

    room.users.forEach((socketId) => {
      if (socketId !== socket.id) {
        const peer = this.io.sockets.sockets.get(socketId);
        if (peer) {
          peer.emit("peer-disconnected");
          peer.leave(roomId);
        }
      }
    });

    this.activeRooms.delete(roomId);
    this.userToRoom.delete(socket.user._id.toString());
  }
}

export default MatchmakingService;