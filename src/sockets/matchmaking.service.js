import { v4 as uuidv4 } from "uuid";

const waitingQueue = new Set(); // userIds waiting for match
const activeRooms = new Map(); // roomId → { user1: userId, user2: userId }
const userToRoom = new Map(); // userId  → roomId
const userToSocket = new Map(); // userId  → socket instance

/**
 * Remove user from any active room and notify peer
 * @param {string} userId
 */
function leaveRoom(userId) {
    const roomId = userToRoom.get(userId);
    if (!roomId) return;

    const peerId = getPeerId(roomId, userId);
    const peerSocket = userToSocket.get(peerId);

    if (peerSocket) {
        peerSocket.emit("peer-disconnected");
    }

    activeRooms.delete(roomId);
    userToRoom.delete(userId);
    if (peerId) userToRoom.delete(peerId);
}

/**
 * Remove user from waiting queue only
 * @param {string} userId
 */
function removeFromQueue(userId) {
    waitingQueue.delete(userId);
}

/**
 * Full cleanup — used only on real disconnect
 * @param {string} userId
 */
function fullCleanup(userId) {
    removeFromQueue(userId);
    leaveRoom(userId);
    userToSocket.delete(userId);
}

export const handleSearch = (socket) => {
    const userId = socket.userId;

    if (waitingQueue.has(userId) || userToRoom.has(userId)) {
        return;
    }

    if (waitingQueue.size === 0) {
        waitingQueue.add(userId);
        socket.emit("queued", { position: waitingQueue.size });
        return;
    }

    const iterator = waitingQueue.values().next();
    const partnerId = iterator.value;
    if (!partnerId) return;
    waitingQueue.delete(partnerId);

    const roomId = uuidv4();

    activeRooms.set(roomId, { user1: userId, user2: partnerId });
    userToRoom.set(userId, roomId);
    userToRoom.set(partnerId, roomId);

    const initiator = Math.random() > 0.5 ? userId : partnerId;
    const partnerSocket = userToSocket.get(partnerId);

    if (!partnerSocket || !partnerSocket.connected) {
        // Partner stale — remove and retry
        waitingQueue.delete(partnerId);
        return;
    }

    if (partnerSocket) {
        socket.emit("matched", {
            roomId,
            isInitiator: userId === initiator,
        });
        partnerSocket.emit("matched", {
            roomId,
            isInitiator: partnerId === initiator,
        });
    } else {
        // Partner disappeared mid-match → rollback only room state
        // IMPORTANT: do NOT delete socket mapping — user is still connected
        leaveRoom(userId);
        removeFromQueue(userId);
        // No auto-requeue — user must click search again
    }
};

const getPeerId = (roomId, userId) => {
    const room = activeRooms.get(roomId);
    if (!room) return null;
    return room.user1 === userId ? room.user2 : room.user1;
};

export const handleOffer = (socket, { offer }) => {
    const userId = socket.userId;
    const roomId = userToRoom.get(userId);
    if (!roomId) return;
    const peerId = getPeerId(roomId, userId);
    if (!peerId) return;
    const peerSocket = userToSocket.get(peerId);
    if (peerSocket) peerSocket.emit("offer", { offer });
};

export const handleAnswer = (socket, { answer }) => {
    const userId = socket.userId;
    const roomId = userToRoom.get(userId);
    if (!roomId) return;
    const peerId = getPeerId(roomId, userId);
    if (!peerId) return;
    const peerSocket = userToSocket.get(peerId);
    if (peerSocket) peerSocket.emit("answer", { answer });
};

export const handleIceCandidate = (socket, { candidate }) => {
    const userId = socket.userId;
    const roomId = userToRoom.get(userId);
    if (!roomId) return;
    const peerId = getPeerId(roomId, userId);
    if (!peerId) return;
    const peerSocket = userToSocket.get(peerId);
    if (peerSocket) peerSocket.emit("ice-candidate", { candidate });
};

export const handleSkip = (socket) => {
    const userId = socket.userId;
    removeFromQueue(userId);
    leaveRoom(userId);
    // No auto re-search
};

export const handleStopSearch = (socket) => {
    removeFromQueue(socket.userId);
};

export const handleMessage = (socket, data) => {
    if (!data || typeof data.text !== "string") return;

    const text = data.text.trim();

    if (text.length === 0) return;
    if (text.length > 500) return; // limit size

    const userId = socket.userId;
    const roomId = userToRoom.get(userId);
    if (!roomId) return;

    const peerId = getPeerId(roomId, userId);
    if (!peerId) return;

    const peerSocket = userToSocket.get(peerId);

    if (peerSocket) {
        peerSocket.emit("receive-message", { text, fromSelf: false });
        socket.emit("receive-message", { text, fromSelf: true });
    }
};

export const handleDisconnect = (socket) => {
    const userId = socket.userId;

    if (!userId) return;
    fullCleanup(socket.userId);
};

export { userToSocket };
