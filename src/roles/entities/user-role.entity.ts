import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  RelationId,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Role } from './role.entity';

@Entity('user_roles')
export class UserRole {
  @PrimaryColumn({ name: 'user_id' })
  @RelationId((ur: UserRole) => ur.user)
  userId: number;

  @PrimaryColumn({ name: 'role_id' })
  @RelationId((ur: UserRole) => ur.role)
  roleId: number;

  @CreateDateColumn({ name: 'assigned_at', type: 'datetime' })
  assignedAt: Date;

  @ManyToOne(() => User, (u) => u.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Role, (r) => r.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
