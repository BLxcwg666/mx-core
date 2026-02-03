import type { ServerResponse } from 'node:http'
import type { NestMiddleware } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { BizIncomingMessage } from '~/transformers/get-req.transformer'
import { getIp } from '~/utils/ip.util'

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, { count: number; resetAt: number }>()
  private readonly limit = 50
  private readonly window = 1000

  private cleanupCounter = 0

  use(req: BizIncomingMessage, res: ServerResponse, next: () => void) {
    const ip = getIp(req)
    if (!ip) {
      return next()
    }

    const now = Date.now()
    const record = this.requests.get(ip)

    if (!record || now > record.resetAt) {
      this.requests.set(ip, { count: 1, resetAt: now + this.window })
      this.maybeCleanup(now)
      return next()
    }

    if (record.count >= this.limit) {
      res.statusCode = 429
      res.setHeader('Retry-After', '1')
      res.end('Too Many Requests')
      return
    }

    record.count++
    next()
  }

  private maybeCleanup(now: number) {
    this.cleanupCounter++
    if (this.cleanupCounter < 1000) return
    this.cleanupCounter = 0

    for (const [key, value] of this.requests) {
      if (now > value.resetAt) {
        this.requests.delete(key)
      }
    }
  }
}
