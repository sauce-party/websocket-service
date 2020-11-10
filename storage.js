const redis = require("redis")
const {promisify} = require("util")
const {REDIS_HOST, TICKET_TTL} = require('./settings')
const log = require('./logger')(__filename)

const client = redis.createClient({host: REDIS_HOST});

client.on('ready', () => log.info(`Connected to Redis at ${REDIS_HOST}:6379`));
client.on('error', error => log.error(error));

module.exports = {

    /**
     * Return the count of occupied slots
     *
     * @param context defines slots search scope if passed
     * @returns {number}
     */
    slots: async function (context) {
        const keys = promisify(client.keys).bind(client)
        try {
            return (await keys(`[ts]:${context || '*'}:*`)).length
        } catch (e) {
            log.error('Unable to determinate slots count')
            log.debug(e)
            return Number.POSITIVE_INFINITY
        }
    },

    /**
     * Stores ticket id into storage
     */
    addTicket: async function (ticket, context) {
        const set = promisify(client.set).bind(client)
        try {
            await set([`t:${context || ''}:${ticket}`, '0', 'PX', TICKET_TTL])
            return true
        } catch (e) {
            log.error('Failed to add new ticket')
            log.debug(e)
        }
    }
}
