import { createLogger, Logger } from '@innei/pretty-logger-nestjs'
import { LOG_DIR } from '~/constants/path.constant'
import { isTest } from './env.global'

// Force enable colors for pretty-logger
if (!process.env.NO_COLOR) {
  process.env.FORCE_COLOR = '1'
}

const logger = createLogger({
  writeToFile: !isTest
    ? {
        loggerDir: LOG_DIR,
        errWriteToStdout: true,
      }
    : undefined,
  formatOptions: {
    date: true,
    colors: true,
  },
})
Logger.setLoggerInstance(logger)
if (!isTest) {
  try {
    logger.wrapAll()
  } catch {
    logger.warn('wrap console failed')
  }
  logger.onData((data) => {
    import('../utils/redis-subpub.util').then(({ redisSubPub }) => {
      redisSubPub.publish('log', data)
    })
  })
}

// HACK: forhidden pm2 to override this method
Object.defineProperty(process.stdout, 'write', {
  value: process.stdout.write,
  writable: false,
  configurable: false,
})
Object.defineProperty(process.stderr, 'write', {
  value: process.stdout.write,
  writable: false,
  configurable: false,
})

// Global Logger instance for static-like usage
const globalLogger = new Logger('System')

export { logger as consola, globalLogger, logger }
