import cluster from 'node:cluster'
import { createLogger, Logger } from '@innei/pretty-logger-nestjs'
import { LOG_DIR } from '~/constants/path.constant'
import pc from 'picocolors'
import { isBootstrapPhase, isTest } from './env.global'

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

const logMethods = [
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
] as const

const getWorkerPrefix = () => {
  if (!cluster.isWorker) return null
  return pc.yellow(`[W${cluster.worker!.id}]`)
}

// Wrap logger methods directly to support filtering during bootstrap
// This ensures wrapAll() also uses our filtered methods
for (const method of logMethods) {
  const original = (logger as any)[method]
  if (typeof original !== 'function') continue

  const wrapped = (...args: unknown[]) => {
    // During bootstrap, only master process outputs logs
    if (isBootstrapPhase() && cluster.isWorker) {
      return
    }
    // After bootstrap, add worker prefix for worker processes
    const workerPrefix = getWorkerPrefix()
    if (workerPrefix && !isBootstrapPhase()) {
      return original.call(logger, workerPrefix, ...args)
    }
    return original.call(logger, ...args)
  }

  // Copy all properties from original function (including .raw)
  for (const key of Object.keys(original)) {
    ;(wrapped as any)[key] = (original as any)[key]
  }
  if ('raw' in original) {
    ;(wrapped as any).raw = (original as any).raw
  }

  ;(logger as any)[method] = wrapped
}

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
  value: process.stderr.write,
  writable: false,
  configurable: false,
})

// Global Logger instance for static-like usage
const globalLogger = new Logger('System')

export { logger as consola, globalLogger, logger }
