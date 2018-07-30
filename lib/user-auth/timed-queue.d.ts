/**
 * FIXME: Consider using limitd or raphi
 */
declare class TimedQueue {
    size: number;
    wait: number;
    constructor(size: number, wait: number);
    list: boolean[];
    push(): void;
}
declare let timedQueueMw: (size?: number, wait?: number) => Polka.Middleware;
