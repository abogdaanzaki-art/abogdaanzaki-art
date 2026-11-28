import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserRole } from '../../roles/entities/user-role.entity';
import { Address } from '../../address/entities/address.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderItemAssignment } from '../../orders/entities/order-item-assignment.entity';
import { Review } from '../../review/entities/review.entity';
import { AssistantProfile } from '../../assistant-profile/entities/assistant-profile.entity';
import { FavoriteAssistant } from '../../favorites/entities/favorite-assistant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => UserRole, (ur) => ur.user, { cascade: true })
  roles: UserRole[];

  @OneToMany(() => Address, (a) => a.user)
  addresses: Address[];

  @OneToMany(() => Order, (o) => o.customer)
  orders: Order[];

  @OneToMany(() => OrderItemAssignment, (a) => a.assistant)
  assignments: OrderItemAssignment[];

  @OneToMany(() => Review, (r) => r.customer)
  reviewsGiven: Review[];

  @OneToMany(() => Review, (r) => r.assistant)
  reviewsReceived: Review[];

  @OneToOne(() => AssistantProfile, (ap) => ap.user, { cascade: false })
  assistantProfile: AssistantProfile;

  @OneToMany(() => FavoriteAssistant, (f) => f.customer)
  favoriteAssistants: FavoriteAssistant[];
}
