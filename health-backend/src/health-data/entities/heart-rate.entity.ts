import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'heart_rate' })
export class HeartRate {
  @PrimaryGeneratedColumn({ name: 'seq', type: 'bigint' })
  seq: string;

  @Column({ name: 'member_id', type: 'varchar', length: 20 })
  memberId: string;

  @Column({ name: 'heart_rate', type: 'smallint' })
  heartRate: number;

  @Column({ name: 'status', type: 'varchar', length: 200, nullable: true })
  status: string | null;

  @Column({ name: 'remark', type: 'varchar', length: 200, nullable: true })
  remark: string | null;

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
