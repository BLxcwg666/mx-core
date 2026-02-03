import type { ServerResponse } from 'node:http'
import type { NestMiddleware } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import { RedisService } from '~/processors/redis/redis.service'
import type { BizIncomingMessage } from '~/transformers/get-req.transformer'
import { getIp } from '~/utils/ip.util'

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly limit = 50
  private readonly windowMs = 1000

  constructor(private readonly redisService: RedisService) {}

  async use(req: BizIncomingMessage, res: ServerResponse, next: () => void) {
    const ip = getIp(req)
    if (!ip) {
      return next()
    }

    const now = Date.now()
    const windowKey = Math.floor(now / this.windowMs)
    const key = `rate_limit:${ip}:${windowKey}`

    try {
      const redis = this.redisService.getClient()
      const count = await redis.incr(key)

      if (count === 1) {
        // First request in this window, set expiry
        await redis.pexpire(key, this.windowMs + 1000) // +1s buffer for cleanup
      }

      if (count > this.limit) {
        res.statusCode = 429
        res.setHeader('Retry-After', '1')
        res.end('Too Many Requests')
        return
      }

      next()
    } catch {
      // Redis error, allow request through
      next()
    }
  }
}
