import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('favorite_assistants')
@Unique('UQ_customer_assistant', ['customerId', 'assistantId'])
export class FavoriteAssistant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  @Index()
  customerId: number;

  @Column({ name: 'assistant_id' })
  @Index()
  assistantId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.favoriteAssistants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assistant_id' })
  assistant: User;
}
