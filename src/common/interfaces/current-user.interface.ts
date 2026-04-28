import { UserRole } from '../enums/user-role.enum';

export interface CurrentUserData {
  sub: string;
  role: UserRole;
  phone: string;
  email: string | null;
}