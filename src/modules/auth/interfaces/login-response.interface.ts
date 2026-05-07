import { UserEntity } from '../../users/entities/user.entity';

export interface LoginResponse {
  accessToken: string;
  user: UserEntity;
}
