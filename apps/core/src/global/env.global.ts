import cluster from 'node:cluster'

export const isMainCluster =
  process.env.NODE_APP_INSTANCE &&
  Number.parseInt(process.env.NODE_APP_INSTANCE) === 0
export const isMainProcess = cluster.isPrimary || isMainCluster

export const isDev = process.env.NODE_ENV == 'development'

export const isTest = !!process.env.TEST
export const isDebugMode = process.env.DEBUG_MODE === '1'
export const cwd = process.cwd()

let _isBootstrapPhase = true

export const isBootstrapPhase = () => _isBootstrapPhase
export const markBootstrapComplete = () => {
  _isBootstrapPhase = false
}

export const getWorkerId = (): number | null => {
  return cluster.isWorker ? cluster.worker!.id : null
}
