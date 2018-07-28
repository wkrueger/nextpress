"use strict";
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
            throw Error("Wait some seconds until attempting again.");
        }
        this.list.push(true);
        setTimeout(() => {
            this.list.pop();
        }, this.wait);
    }
}
let timedQueueMw = (size = 10, wait = 10000) => {
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