import cluster from 'node:cluster'
import { createLogger, Logger } from '@innei/pretty-logger-nestjs'
import { LOG_DIR } from '~/constants/path.constant'
import pc from 'picocolors'
import { isBootstrapPhase, isTest } from './env.global'

// Force enable colors for pretty-logger
if (!process.env.NO_COLOR) {
  process.env.FORCE_COLOR = '1'
}

const originalLogger = createLogger({
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

const logMethods = new Set([
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'verbose',
  'fatal',
  'success',
  'ready',
  'start',
  'box',
])

const getWorkerPrefix = () => {
  if (!cluster.isWorker) return null
  return pc.yellow(`[W${cluster.worker!.id}]`)
}

const logger = new Proxy(originalLogger, {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver)

    if (typeof original === 'function' && logMethods.has(prop as string)) {
      return (...args: unknown[]) => {
        if (isBootstrapPhase() && cluster.isWorker) {
          return
        }
        const workerPrefix = getWorkerPrefix()
        if (workerPrefix && !isBootstrapPhase()) {
          return (original as Function).apply(target, [workerPrefix, ...args])
        }
        return (original as Function).apply(target, args)
      }
    }

    return original
  },
}) as typeof originalLogger

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
