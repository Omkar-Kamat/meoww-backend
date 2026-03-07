import { v4 as uuidv4 } from "uuid";

const waitingQueue = new Set();
const activeRooms = new Map(); 
const userToRoom = new Map(); 
const userToSocket = new Map(); 

/**
 * Remove user from any active room and notify peer.
 * Does NOT touch userToSocket — peer notification still needs it.
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
 * Remove user from waiting queue only.
 */
function removeFromQueue(userId) {
    waitingQueue.delete(userId);
}

/**
 * Full cleanup — used only on a real disconnect.
 * Critically: only deletes from userToSocket if the socket being cleaned up
 * is still the currently registered socket for this user.
 * 
 * Race condition this prevents:
 *   1. User opens a second tab → new socket connects
 *   2. socket.server.js sets userToSocket[userId] = newSocket
 *   3. Old socket's "disconnect" fires → fullCleanup runs
 *   4. Without the guard: userToSocket[userId] gets deleted, new socket is orphaned
 *   5. With the guard: we check socket.id before deleting — new socket survives
 */
function fullCleanup(socket) {
    const userId = socket.userId;
    if (!userId) return;

    removeFromQueue(userId);
    leaveRoom(userId);

    // Only remove from the map if THIS socket is still the active one.
    // If a newer socket already replaced it (duplicate session handling),
    // we must NOT delete the new registration.
    if (userToSocket.get(userId) === socket) {
        userToSocket.delete(userId);
    }
}

const getPeerId = (roomId, userId) => {
    const room = activeRooms.get(roomId);
    if (!room) return null;
    return room.user1 === userId ? room.user2 : room.user1;
};

export const handleSearch = (socket) => {
    const userId = socket.userId;

    // Ignore if already queued or in a room
    if (waitingQueue.has(userId) || userToRoom.has(userId)) {
        return;
    }

    // No one waiting — join the queue
    if (waitingQueue.size === 0) {
        waitingQueue.add(userId);
        socket.emit("queued", { position: waitingQueue.size });
        return;
    }

    // Someone is waiting — attempt to match
    const partnerId = waitingQueue.values().next().value;
    if (!partnerId) return;

    const partnerSocket = userToSocket.get(partnerId);

    // Partner's socket is stale or disconnected — remove them and requeue self
    if (!partnerSocket || !partnerSocket.connected) {
        waitingQueue.delete(partnerId);
        // Requeue this user and notify them they're still waiting
        waitingQueue.add(userId);
        socket.emit("queued", { position: waitingQueue.size });
        return;
    }

    // Both sockets are live — remove partner from queue and create room
    waitingQueue.delete(partnerId);

    const roomId = uuidv4();
    activeRooms.set(roomId, { user1: userId, user2: partnerId });
    userToRoom.set(userId, roomId);
    userToRoom.set(partnerId, roomId);

    const initiator = Math.random() > 0.5 ? userId : partnerId;

    socket.emit("matched", {
        roomId,
        isInitiator: userId === initiator,
    });
    partnerSocket.emit("matched", {
        roomId,
        isInitiator: partnerId === initiator,
    });
    // NOTE: The previous code had an unreachable else branch here because
    // partnerSocket was already verified as live just above. Removed.
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
};

export const handleStopSearch = (socket) => {
    removeFromQueue(socket.userId);
};

export const handleMessage = (socket, data) => {
    if (!data || typeof data.text !== "string") return;

    const text = data.text.trim();
    if (text.length === 0) return;
    if (text.length > 500) return;

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
    // Pass the whole socket so fullCleanup can check socket.id
    fullCleanup(socket);
};

export { userToSocket };