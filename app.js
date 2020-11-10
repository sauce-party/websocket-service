const WebSocketServer = require("ws").Server
const {v4: uuid} = require('uuid')
const storage = require('./storage')
const settings = require('./settings')
const queue = require('./queue')
const log = require('./logger')(__filename)

// Web Sockets
const options = {'port': settings.WS_PORT}
const wss = new WebSocketServer(options, () => log.info(`WSS has been started at ${settings.WS_PORT}`));

// WS routes
wss.on("connection", async (ws, request) => {
    log.info(`Connection accepted (${wss.clients.size} total)`)
    if (!await send(ws, `heartbeat|${settings.HEARTBEAT}`)) {
        log.debug('Failed to send heartbeat config')
        return;
    }
    // Message route, acceptable messages: session, session|context
    ws.on("message", async message => {
        const match = message.match('^session(|\\|(.+?))$')
        if (!match) {
            log.debug(`Unknown message ${message}`)
            ws.terminate()
            return;
        }
        queue.add(ws, match[2])
        await send(ws, `queued|${queue.size}`)
    })
    // Disconnected route
    ws.on("close", () => log.info(`Client disconnected (${wss.clients.size} total)`))
});

/**
 * Sends message to specified socket and checks for errors
 * @return {Promise<boolean>} true if message was sent, false otherwise
 */
async function send(ws, message) {
    try {
        await ws.send(message)
        log.debug(`Message sent: ${message}`)
        return true
    } catch (e) {
        log.error(`Unable to send message ${e}`)
        log.debug(`Message ${message}`)
    }
}

// Start scheduler
setInterval(async () => {
    for await (const data of queue.available()) {
        const ticket = uuid()
        if (await storage.addTicket(ticket, data.context)) {
            await send(data.socket, `ticket|${ticket}|${settings.TICKET_TTL}`)
        }
    }
}, settings.SCHEDULER_INTERVAL)
