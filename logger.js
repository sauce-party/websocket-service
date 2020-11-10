const winston = require('winston')
const path = require('path')
const {LOG_LEVEL} = require('./settings')

/**
 * Builds a logger with predefined format
 *
 * @param filename to build logger for
 * @return {winston.Logger} instance
 */
module.exports = function (filename) {
    const name = path.basename(filename)
    const format = winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.printf(m => `${m.timestamp} [${m.level}] ${name}: ${m.message}`)
    )
    return winston.createLogger({
        level: LOG_LEVEL,
        format: format,
        transports: [new winston.transports.Console()]
    });
}
