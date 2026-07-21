import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/typeorm/numeric.transformer';

@Entity({ name: 'sleep' })
export class Sleep {
  @PrimaryGeneratedColumn({ name: 'seq', type: 'bigint' })
  seq: string;

  @Column({ name: 'member_id', type: 'varchar', length: 20 })
  memberId: string;

  @Column({
    name: 'sleep_hours',
    type: 'numeric',
    precision: 3,
    scale: 1,
    transformer: numericTransformer,
  })
  sleepHours: number;

  @Column({ name: 'quality', type: 'varchar', length: 20, nullable: true })
  quality: string | null;

  @Column({ name: 'bed_time', type: 'timestamptz' })
  bedTime: Date;

  @Column({ name: 'wake_time', type: 'timestamptz' })
  wakeTime: Date;

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
