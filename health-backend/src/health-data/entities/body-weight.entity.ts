import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/typeorm/numeric.transformer';

@Entity({ name: 'body_weight' })
export class BodyWeight {
  @PrimaryGeneratedColumn({ name: 'seq', type: 'bigint' })
  seq: string;

  @Column({ name: 'member_id', type: 'varchar', length: 20 })
  memberId: string;

  @Column({
    name: 'weight_kg',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
  })
  weightKg: number;

  @Column({
    name: 'bmi',
    type: 'numeric',
    precision: 4,
    scale: 1,
    transformer: numericTransformer,
  })
  bmi: number;

  @Column({
    name: 'skeletal_muscle_mass_kg',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  skeletalMuscleMassKg: number | null;

  @Column({
    name: 'body_fat_percentage',
    type: 'numeric',
    precision: 4,
    scale: 1,
    nullable: true,
    transformer: numericTransformer,
  })
  bodyFatPercentage: number | null;

  @Column({ name: 'status', type: 'varchar', length: 100, nullable: true })
  status: string | null;

  @Column({ name: 'remark', type: 'varchar', length: 200, nullable: true })
  remark: string | null;

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
