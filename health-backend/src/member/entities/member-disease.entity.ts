import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'member_disease' })
export class MemberDisease {
  @PrimaryGeneratedColumn({ name: 'diag_seq', type: 'bigint' })
  diagSeq: string;

  @Column({ name: 'member_id', type: 'varchar', length: 20 })
  memberId: string;

  @Column({ name: 'disease_id', type: 'varchar', length: 20 })
  diseaseId: string;

  @Column({
    name: 'diag_content',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  diagContent: string | null;

  @Column({ name: 'diag_date', type: 'timestamptz' })
  diagDate: Date;

  @Column({ name: 'mod_date', type: 'timestamptz', nullable: true })
  modDate: Date | null;
}
