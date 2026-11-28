import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';

export interface SafeUserDto {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  roles: { id: number; name: string }[];
}

export function toSafeUser(user: User | null | undefined): SafeUserDto | null {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt,
    roles: (user.roles || []).map((ur: UserRole) => ({ id: ur.roleId, name: ur.role?.name ?? '' })),
  };
}

export function toSafeUserArray(users: User[]): SafeUserDto[] {
  return users.map((u) => toSafeUser(u) as SafeUserDto);
}
