import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'disease_code' })
export class DiseaseCode {
  @PrimaryColumn({ name: 'disease_id', type: 'varchar', length: 20 })
  diseaseId: string;

  @Column({ name: 'disease_name_en', type: 'varchar', length: 100 })
  diseaseNameEn: string;

  @Column({ name: 'disease_name_kr', type: 'varchar', length: 100 })
  diseaseNameKr: string;

  @Column({
    name: 'disease_category',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  diseaseCategory: string | null;

  @Column({ name: 'severity', type: 'varchar', length: 20, nullable: true })
  severity: string | null;

  @Column({
    name: 'disease_desc',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  diseaseDesc: string | null;

  @CreateDateColumn({ name: 'reg_date', type: 'timestamptz' })
  regDate: Date;

  @UpdateDateColumn({ name: 'mod_date', type: 'timestamptz', nullable: true })
  modDate: Date | null;
}
