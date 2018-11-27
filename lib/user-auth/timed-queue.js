"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messages_1 = require("../messages/messages");
/**
 * FIXME: Consider using limitd or raphi
 */
class TimedQueue {
    constructor(size, wait) {
        this.size = size;
        this.wait = wait;
        this.list = [];
    }
    push() {
        if (this.list.length >= this.size) {
            throw Error(messages_1.messages.wait_some_seconds);
        }
        this.list.push(true);
        setTimeout(() => {
            this.list.pop();
        }, this.wait);
    }
}
exports.timedQueueMw = (size = 10, wait = 10000) => {
    let queue = new TimedQueue(size, wait);
    return (req, res, next) => {
        try {
            queue.push();
        }
        catch (err) {
            next(err);
            return;
        }
        next();
    };
};
//# sourceMappingURL=timed-queue.js.map