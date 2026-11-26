import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ServiceType } from '../../service-type/entities/service-type.entity';
import { VerificationStatus } from '../assistant-profile.types';

@Entity('assistant_profiles')
export class AssistantProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', unique: true })
  @Index()
  userId: number;

  @OneToOne(() => User, (u) => u.assistantProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ name: 'profile_image_url', nullable: true })
  profileImageUrl: string;

  @Column({ nullable: true })
  city: string;

  @Column({ name: 'verification_status', type: 'varchar', default: 'PENDING' })
  verificationStatus: VerificationStatus;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToMany(() => ServiceType, (s) => s.assistantProfiles, { cascade: false })
  @JoinTable({
    name: 'assistant_profile_services',
    joinColumn: { name: 'assistant_profile_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'service_type_id', referencedColumnName: 'id' },
  })
  services: ServiceType[];
}
