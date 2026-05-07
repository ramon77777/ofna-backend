import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { CurrentUserData } from '../interfaces/current-user.interface';

interface RequestWithCurrentUser {
  user?: CurrentUserData;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithCurrentUser>();

    return request.user;
  },
);
