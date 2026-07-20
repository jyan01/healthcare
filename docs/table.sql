CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- =====================================================================
-- Healthcare 내부 데이터베이스 테이블 생성 스크립트 (PostgreSQL)
-- 출처: docs/DATA_MODEL.md "🏠 내부 데이터" 섹션
-- 생성 순서: member → disease_code → member_disease → 실시간 정보 테이블 5종
-- =====================================================================
DROP TABLE IF EXISTS step_count, glucose, body_weight, blood_pressure, heart_rate, member_disease, disease_code, member CASCADE;

-- ---------------------------------------------------------------------
-- 1. 회원관리테이블 (member)
-- ---------------------------------------------------------------------
CREATE TABLE member (
    member_id    VARCHAR(20)  NOT NULL,
    password     VARCHAR(200) NOT NULL,
    member_name  VARCHAR(50)  NOT NULL,
    gender       CHAR(1)      NOT NULL,
    birth_date   VARCHAR(8)   NOT NULL,
    member_type  VARCHAR(4)   NOT NULL,
    api_key      VARCHAR(100) NOT NULL,
    reg_date     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    mod_date     TIMESTAMPTZ,
    CONSTRAINT pk_member PRIMARY KEY (member_id)
);

COMMENT ON TABLE member IS '회원관리테이블';
COMMENT ON COLUMN member.member_id   IS '회원ID (PK) - 외부 시뮬레이터 userId와 동일 값';
COMMENT ON COLUMN member.password    IS '암호';
COMMENT ON COLUMN member.member_name IS '회원명';
COMMENT ON COLUMN member.gender      IS '성별 (M/F)';
COMMENT ON COLUMN member.birth_date  IS '생년월일 (YYYYMMDD)';
COMMENT ON COLUMN member.member_type IS '회원유형 (예: PAT-환자, DOC-의사, 코드 값 별도 확정 필요)';
COMMENT ON COLUMN member.api_key     IS '외부 시뮬레이터(healthsim) 접속 인증용 API Key';
COMMENT ON COLUMN member.reg_date    IS '등록일';
COMMENT ON COLUMN member.mod_date    IS '수정일';

-- ---------------------------------------------------------------------
-- 2. 질병코드테이블 (disease_code)
-- ---------------------------------------------------------------------
CREATE TABLE disease_code (
    disease_id       VARCHAR(20)  NOT NULL,
    disease_name_en  VARCHAR(100) NOT NULL,
    disease_name_kr  VARCHAR(100) NOT NULL,
    disease_category VARCHAR(50),
    severity         VARCHAR(20),
    disease_desc     VARCHAR(512),
    reg_date         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    mod_date         TIMESTAMPTZ,
    CONSTRAINT pk_disease_code PRIMARY KEY (disease_id)
);

COMMENT ON TABLE disease_code IS '질병코드테이블';
COMMENT ON COLUMN disease_code.disease_id       IS '질병ID (PK)';
COMMENT ON COLUMN disease_code.disease_name_en  IS '질병명(영어)';
COMMENT ON COLUMN disease_code.disease_name_kr  IS '질병명(한글)';
COMMENT ON COLUMN disease_code.disease_category IS '질병카테고리';
COMMENT ON COLUMN disease_code.severity         IS '중증도';
COMMENT ON COLUMN disease_code.disease_desc     IS '질병설명';
COMMENT ON COLUMN disease_code.reg_date         IS '등록일';
COMMENT ON COLUMN disease_code.mod_date         IS '수정일';

-- ---------------------------------------------------------------------
-- 3. 회원-질병관리테이블 (member_disease)
-- ---------------------------------------------------------------------
CREATE TABLE member_disease (
    diag_seq     BIGSERIAL    NOT NULL,
    member_id    VARCHAR(20)  NOT NULL,
    disease_id   VARCHAR(20)  NOT NULL,
    diag_content VARCHAR(512),
    diag_date    TIMESTAMPTZ  NOT NULL,
    mod_date     TIMESTAMPTZ,
    CONSTRAINT pk_member_disease PRIMARY KEY (diag_seq),
    CONSTRAINT fk_member_disease_member  FOREIGN KEY (member_id)  REFERENCES member (member_id),
    CONSTRAINT fk_member_disease_disease FOREIGN KEY (disease_id) REFERENCES disease_code (disease_id)
);

COMMENT ON TABLE member_disease IS '회원-질병관리테이블';
COMMENT ON COLUMN member_disease.diag_seq     IS '진단시퀀스번호 (PK)';
COMMENT ON COLUMN member_disease.member_id    IS '회원ID (FK -> member)';
COMMENT ON COLUMN member_disease.disease_id   IS '질병ID (FK -> disease_code)';
COMMENT ON COLUMN member_disease.diag_content IS '진단내용';
COMMENT ON COLUMN member_disease.diag_date    IS '진단일';
COMMENT ON COLUMN member_disease.mod_date     IS '수정일';

CREATE INDEX idx_member_disease_member_id  ON member_disease (member_id);
CREATE INDEX idx_member_disease_disease_id ON member_disease (disease_id);

-- ---------------------------------------------------------------------
-- 4. 회원-심박정보테이블 (heart_rate)
-- ---------------------------------------------------------------------
CREATE TABLE heart_rate (
    seq         BIGSERIAL    NOT NULL,
    member_id   VARCHAR(20)  NOT NULL,
    heart_rate  SMALLINT     NOT NULL,
    status      VARCHAR(200),
    remark      VARCHAR(200),
    measured_at TIMESTAMPTZ  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_heart_rate PRIMARY KEY (seq),
    CONSTRAINT fk_heart_rate_member FOREIGN KEY (member_id) REFERENCES member (member_id)
);

COMMENT ON TABLE heart_rate IS '회원-심박정보테이블';
COMMENT ON COLUMN heart_rate.seq         IS '시퀀스번호 (PK)';
COMMENT ON COLUMN heart_rate.member_id   IS '회원ID (논리적 FK -> member)';
COMMENT ON COLUMN heart_rate.heart_rate  IS '심박수(bpm)';
COMMENT ON COLUMN heart_rate.status      IS '상태';
COMMENT ON COLUMN heart_rate.remark      IS '비고';
COMMENT ON COLUMN heart_rate.measured_at IS '측정일시';
COMMENT ON COLUMN heart_rate.created_at  IS '생성일시';

CREATE INDEX idx_heart_rate_member_id   ON heart_rate (member_id);
CREATE INDEX idx_heart_rate_measured_at ON heart_rate (measured_at);

-- ---------------------------------------------------------------------
-- 5. 회원-혈압정보테이블 (blood_pressure)
-- ---------------------------------------------------------------------
CREATE TABLE blood_pressure (
    seq         BIGSERIAL    NOT NULL,
    member_id   VARCHAR(20)  NOT NULL,
    systolic    SMALLINT     NOT NULL,
    diastolic   SMALLINT     NOT NULL,
    status      VARCHAR(200),
    remark      VARCHAR(200),
    measured_at TIMESTAMPTZ  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_blood_pressure PRIMARY KEY (seq),
    CONSTRAINT fk_blood_pressure_member FOREIGN KEY (member_id) REFERENCES member (member_id)
);

COMMENT ON TABLE blood_pressure IS '회원-혈압정보테이블';
COMMENT ON COLUMN blood_pressure.seq         IS '시퀀스번호 (PK)';
COMMENT ON COLUMN blood_pressure.member_id   IS '회원ID (논리적 FK -> member)';
COMMENT ON COLUMN blood_pressure.systolic    IS '수축기';
COMMENT ON COLUMN blood_pressure.diastolic   IS '이완기';
COMMENT ON COLUMN blood_pressure.status      IS '상태 (백엔드가 수축기/이완기 값으로 판정하여 저장)';
COMMENT ON COLUMN blood_pressure.remark      IS '비고';
COMMENT ON COLUMN blood_pressure.measured_at IS '측정일시';
COMMENT ON COLUMN blood_pressure.created_at  IS '생성일시';

CREATE INDEX idx_blood_pressure_member_id   ON blood_pressure (member_id);
CREATE INDEX idx_blood_pressure_measured_at ON blood_pressure (measured_at);

-- ---------------------------------------------------------------------
-- 6. 회원-체중관리테이블 (body_weight)
-- ---------------------------------------------------------------------
CREATE TABLE body_weight (
    seq                    BIGSERIAL    NOT NULL,
    member_id              VARCHAR(20)  NOT NULL,
    weight_kg              NUMERIC(5,2) NOT NULL,
    bmi                    NUMERIC(4,1) NOT NULL,
    skeletal_muscle_mass_kg NUMERIC(5,2),
    body_fat_percentage    NUMERIC(4,1),
    status                 VARCHAR(100),
    remark                 VARCHAR(200),
    measured_at            TIMESTAMPTZ  NOT NULL,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_body_weight PRIMARY KEY (seq),
    CONSTRAINT fk_body_weight_member FOREIGN KEY (member_id) REFERENCES member (member_id)
);

COMMENT ON TABLE body_weight IS '회원-체중관리테이블';
COMMENT ON COLUMN body_weight.seq                     IS '시퀀스번호 (PK)';
COMMENT ON COLUMN body_weight.member_id               IS '회원ID (논리적 FK -> member)';
COMMENT ON COLUMN body_weight.weight_kg               IS '체중(kg)';
COMMENT ON COLUMN body_weight.bmi                     IS 'BMI';
COMMENT ON COLUMN body_weight.skeletal_muscle_mass_kg IS '골격근량';
COMMENT ON COLUMN body_weight.body_fat_percentage     IS '체지방률';
COMMENT ON COLUMN body_weight.status                  IS '상태';
COMMENT ON COLUMN body_weight.remark                  IS '비고';
COMMENT ON COLUMN body_weight.measured_at             IS '측정일시';
COMMENT ON COLUMN body_weight.created_at              IS '생성일시';

CREATE INDEX idx_body_weight_member_id   ON body_weight (member_id);
CREATE INDEX idx_body_weight_measured_at ON body_weight (measured_at);

-- ---------------------------------------------------------------------
-- 7. 회원-혈당정보테이블 (glucose)
-- ---------------------------------------------------------------------
CREATE TABLE glucose (
    seq           BIGSERIAL    NOT NULL,
    member_id     VARCHAR(20)  NOT NULL,
    glucose_value SMALLINT     NOT NULL,
    status        VARCHAR(100),
    remark        VARCHAR(200),
    measured_at   TIMESTAMPTZ  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_glucose PRIMARY KEY (seq),
    CONSTRAINT fk_glucose_member FOREIGN KEY (member_id) REFERENCES member (member_id)
);

COMMENT ON TABLE glucose IS '회원-혈당정보테이블';
COMMENT ON COLUMN glucose.seq           IS '시퀀스번호 (PK)';
COMMENT ON COLUMN glucose.member_id     IS '회원ID (논리적 FK -> member)';
COMMENT ON COLUMN glucose.glucose_value IS '혈당값(mg/dL)';
COMMENT ON COLUMN glucose.status        IS '상태 (normal/elevated/high)';
COMMENT ON COLUMN glucose.remark        IS '비고';
COMMENT ON COLUMN glucose.measured_at   IS '측정일시';
COMMENT ON COLUMN glucose.created_at    IS '생성일시';

CREATE INDEX idx_glucose_member_id   ON glucose (member_id);
CREATE INDEX idx_glucose_measured_at ON glucose (measured_at);

-- ---------------------------------------------------------------------
-- 8. 회원-걸음수정보테이블 (step_count)
-- ---------------------------------------------------------------------
CREATE TABLE step_count (
    seq         BIGSERIAL   NOT NULL,
    member_id   VARCHAR(20) NOT NULL,
    total_steps INTEGER     NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_step_count PRIMARY KEY (seq),
    CONSTRAINT fk_step_count_member FOREIGN KEY (member_id) REFERENCES member (member_id)
);

COMMENT ON TABLE step_count IS '회원-걸음수정보테이블';
COMMENT ON COLUMN step_count.seq         IS '시퀀스번호 (PK)';
COMMENT ON COLUMN step_count.member_id   IS '회원ID (논리적 FK -> member)';
COMMENT ON COLUMN step_count.total_steps IS '당일 누적걸음수';
COMMENT ON COLUMN step_count.measured_at IS '측정일시';
COMMENT ON COLUMN step_count.created_at  IS '생성일시';

CREATE INDEX idx_step_count_member_id   ON step_count (member_id);
CREATE INDEX idx_step_count_measured_at ON step_count (measured_at);
