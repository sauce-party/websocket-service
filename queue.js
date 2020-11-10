const storage = require('./storage')
const {MAX_SESSIONS, CONTEXT_CONFIG} = require('./settings')
const log = require('./logger')(__filename)

const queue = []
const instance = {}

/**
 * Adds socket to the queue
 *
 * @param socket to add to the queue
 * @param context optional parameter that indicates socket relates to some context (e. g. team or project)
 */
instance.add = function (socket, context) {
    const item = {socket: socket}
    if (context) {
        item.context = context
    }
    queue.push(item)
    log.debug(`Socket was queued (${queue.length} total)`)
}

/**
 * Removes all the passed ws entries from a queue
 */
instance.remove = function (ws) {
    queue.forEach((value, index) => {
        if (value.socket === ws) {
            queue.splice(index, 1)
        }
    })
    log.debug(`Socket was removed (${queue.length} total)`)
}

/**
 * Provides generator that produces sequence of fair ordered sockets
 *
 * In simple case, removes and returns socket from the head of queue. In more complex cases consider context
 */
instance.available = async function* () {
    while (queue.length > 0 && await storage.slots() < MAX_SESSIONS) {
        let candidate;
        for (const item of queue.filter(item => item.context)) {
            const key = item.context
            if (CONTEXT_CONFIG.has(key) && await storage.slots(key) < CONTEXT_CONFIG.get(key)) {
                candidate = item
                const index = queue.findIndex(i => i === item)
                queue.splice(index, 1)
                log.debug(`Found slot for ${key} context`)
                break
            } else {
                log.debug(`Regular slot will be used`)
            }
        }
        yield candidate || queue.shift()
    }
}

/**
 * Size of items in a queue that wait for tickets
 */
Object.defineProperty(instance, 'size', {
    get: function () {
        return queue.length
    }
});

module.exports = instance
