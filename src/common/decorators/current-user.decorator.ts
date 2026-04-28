import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { CurrentUserData } from '../interfaces/current-user.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);