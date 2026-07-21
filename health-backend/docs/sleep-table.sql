-- 수면 데이터(고도화) 테이블. synchronize: false 라서 TypeORM이 자동 생성하지 않으므로,
-- 배포 전에 공유 DB에 이 스크립트를 한 번 실행해야 한다.
-- src/health-data/entities/sleep.entity.ts 와 컬럼이 1:1로 대응된다.

CREATE TABLE IF NOT EXISTS sleep (
    seq BIGSERIAL PRIMARY KEY,
    member_id VARCHAR(20) NOT NULL,
    sleep_hours NUMERIC(3, 1) NOT NULL,
    quality VARCHAR(20),
    bed_time TIMESTAMPTZ NOT NULL,
    wake_time TIMESTAMPTZ NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sleep_member_measured ON sleep (member_id, measured_at);
