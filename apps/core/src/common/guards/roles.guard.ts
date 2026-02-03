import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import { AuthService } from '~/modules/auth/auth.service'
import { ConfigsService } from '~/modules/configs/configs.service'
import { UserService } from '~/modules/user/user.service'
import type { FastifyBizRequest } from '~/transformers/get-req.transformer'
import { getNestExecutionContextRequest } from '~/transformers/get-req.transformer'
import { isJWT } from '~/utils/validator.util'

/**
 * 区分游客和主人的守卫
 */

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configs: ConfigsService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context)
    let isAuthenticated = false

    const session = await this.authService.getSessionUser(request.raw)

    if (session) {
      const readerId = session.user?.id
      request.readerId = readerId
      Object.assign(request.raw, { readerId })

      const isOwner = !!session.user?.isOwner
      if (isOwner) {
        isAuthenticated = true
        this.attachUserAndToken(
          request,
          await this.userService.getMaster(),
          request.headers.authorization || (request.query as any)?.token || '',
        )
      }
    }

    if (!isAuthenticated) {
      const query = request.query as any
      const headers = request.headers
      const Authorization: string =
        headers.authorization || headers.Authorization || query.token

      if (Authorization) {
        try {
          if (this.authService.isCustomToken(Authorization)) {
            const [isValid, userModel] =
              await this.authService.verifyCustomToken(Authorization)
            if (isValid) {
              isAuthenticated = true
              this.attachUserAndToken(request, userModel!, Authorization)
            }
          } else {
            const jwt = Authorization.replace(/[Bb]earer /, '')
            if (isJWT(jwt)) {
              const valid = await this.authService.jwtServicePublic.verify(jwt)
              if (valid) {
                isAuthenticated = true
                this.attachUserAndToken(
                  request,
                  await this.userService.getMaster(),
                  Authorization,
                )
              }
            }
          }
        } catch {
          // guest
        }
      }
    }

    request.isGuest = !isAuthenticated
    request.isAuthenticated = isAuthenticated

    Object.assign(request.raw, {
      isGuest: !isAuthenticated,
      isAuthenticated,
    })

    return true
  }

  getRequest(context: ExecutionContext) {
    return getNestExecutionContextRequest(context)
  }

  private attachUserAndToken(
    request: FastifyBizRequest,
    user: any,
    token: string,
  ) {
    request.user = user
    request.token = token

    Object.assign(request.raw, {
      user,
      token,
    })
  }
}
