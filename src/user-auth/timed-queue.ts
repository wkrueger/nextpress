import { RequestHandler } from "express"

/**
 * FIXME: Consider using limitd or raphi
 */

class TimedQueue {
  constructor(public size: number, public wait: number) {}

  list = [] as boolean[]

  push() {
    if (this.list.length >= this.size) {
      throw Error("Wait some seconds until attempting again.")
    }
    this.list.push(true)
    setTimeout(() => {
      this.list.pop()
    }, this.wait)
  }
}

export let timedQueueMw: (size?: number, wait?: number) => RequestHandler = (
  size = 10,
  wait = 10000
) => {
  let queue = new TimedQueue(size, wait)
  return (req, res, next) => {
    try {
      queue.push()
    } catch (err) {
      next(err)
      return
    }
    next()
  }
}
