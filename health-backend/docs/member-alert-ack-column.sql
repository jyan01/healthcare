-- 회원목록 "최근 이상감지" 빨간 점을 회원상세 화면 확인 시 사라지게 하기 위한 컬럼.
-- synchronize: false 라서 TypeORM이 자동 생성하지 않으므로, 배포 전에 공유 DB에
-- 이 스크립트를 한 번 실행해야 한다.
-- src/member/entities/member.entity.ts 의 lastAlertAckAt 과 대응된다.

ALTER TABLE member ADD COLUMN IF NOT EXISTS last_alert_ack_at TIMESTAMPTZ;
