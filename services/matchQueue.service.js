class MatchQueue {
    constructor() {
        this.queue = new Map();
    }

    add(userId) {
        if (this.queue.has(userId)) {
            return false;
        }

        this.queue.set(userId, Date.now());
        return true;
    }

    remove(userId) {
        return this.queue.delete(userId);
    }

    has(userId) {
        return this.queue.has(userId);
    }

    findMatch(excludeUserId) {
        for (const [userId] of this.queue) {
            if (userId !== excludeUserId) {
                return userId;
            }
        }
        return null;
    }

    size() {
        return this.queue.size;
    }
}

const matchQueue = new MatchQueue();

export default matchQueue;
