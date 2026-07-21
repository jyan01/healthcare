import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { MemberType } from '../../shared';

@Entity({ name: 'member' })
export class Member {
  @PrimaryColumn({ name: 'member_id', type: 'varchar', length: 20 })
  memberId: string;

  @Column({ name: 'password', type: 'varchar', length: 200 })
  password: string;

  @Column({ name: 'member_name', type: 'varchar', length: 50 })
  memberName: string;

  @Column({ name: 'gender', type: 'char', length: 1 })
  gender: string;

  @Column({ name: 'birth_date', type: 'varchar', length: 8 })
  birthDate: string;

  @Column({ name: 'member_type', type: 'varchar', length: 4 })
  memberType: MemberType;

  @Column({ name: 'api_key', type: 'varchar', length: 100 })
  apiKey: string;

  @CreateDateColumn({ name: 'reg_date', type: 'timestamptz' })
  regDate: Date;

  @UpdateDateColumn({ name: 'mod_date', type: 'timestamptz', nullable: true })
  modDate: Date | null;

  /** 회원상세 화면을 마지막으로 조회한 시각 — 이 시각 이후 발생한 이상감지만 회원목록 빨간 점에 표시한다 [고도화] */
  @Column({
    name: 'last_alert_ack_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastAlertAckAt: Date | null;
}
