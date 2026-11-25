import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserRole } from './user-role.entity';

export type RoleName = 'CUSTOMER' | 'ASSISTANT' | 'ADMIN';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => UserRole, (ur) => ur.role)
  userRoles: UserRole[];
}
