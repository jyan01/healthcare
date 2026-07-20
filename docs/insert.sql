-- =====================================================================
-- Healthcare 초기 데이터 적재 스크립트 (PostgreSQL)
-- 출처 CSV: docs/users_seed.csv, docs/disease_code_seed.csv, docs/user_disease_seed.csv
-- 대상 테이블: docs/table.sql (member, disease_code, member_disease)
--
-- 비밀번호(password)는 PostgreSQL의 pgcrypto 확장이 제공하는 crypt()/gen_salt('bf')
-- (bcrypt) 해시 함수로 저장한다. 미리 확장을 활성화해야 한다.
-- =====================================================================
TRUNCATE TABLE member_disease, disease_code, member CASCADE;


CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. 회원관리테이블 (member) — docs/users_seed.csv
-- ---------------------------------------------------------------------
INSERT INTO member (member_id, password, member_name, gender, birth_date, member_type, api_key) VALUES
    ('admin',     crypt('admin001123!',  gen_salt('bf')), '김닥터', 'M', '19680311', 'D', 'admin'),
    ('user_001',  crypt('user_001123!',  gen_salt('bf')), '김민준', 'M', '19980722', 'P', 'key_001'),
    ('user_002',  crypt('user_002123!',  gen_salt('bf')), '이서연', 'F', '19921105', 'P', 'key_002'),
    ('user_003',  crypt('user_003123!',  gen_salt('bf')), '박지훈', 'M', '19810217', 'P', 'key_003'),
    ('user_004',  crypt('user_004123!',  gen_salt('bf')), '최수빈', 'F', '19740930', 'P', 'key_004'),
    ('user_005',  crypt('user_005123!',  gen_salt('bf')), '정하늘', 'M', '20070508', 'P', 'key_005'),
    ('user_006',  crypt('user_006123!',  gen_salt('bf')), '한지민', 'F', '19591224', 'P', 'key_006'),
    ('user_007',  crypt('user_007123!',  gen_salt('bf')), '김도윤', 'M', '19950413', 'P', 'key_007'),
    ('user_008',  crypt('user_008123!',  gen_salt('bf')), '이민지', 'F', '20020819', 'P', 'key_008'),
    ('user_009',  crypt('user_009123!',  gen_salt('bf')), '오성민', 'M', '19680602', 'P', 'key_009'),
    ('user_010',  crypt('user_010123!',  gen_salt('bf')), '서예진', 'F', '19871027', 'P', 'key_010');

-- ---------------------------------------------------------------------
-- 2. 질병코드테이블 (disease_code) — docs/disease_code_seed.csv
-- ---------------------------------------------------------------------
INSERT INTO disease_code (disease_id, disease_name_en, disease_name_kr, disease_category, severity, disease_desc) VALUES
    ('HYP',  'Hypertension',          '고혈압',        'cardiovascular',  'moderate', 'High blood pressure leading to increased cardiovascular risk.'),
    ('DIA',  'Diabetes',              '당뇨병',        'metabolic',       'moderate', 'Type 2 diabetes with glucose regulation issues.'),
    ('MI',   'Myocardial Infarction', '심근경색',      'cardiovascular',  'high',     'History of heart attack requiring careful heart rate monitoring.'),
    ('ARR',  'Arrhythmia',            '부정맥',        'cardiovascular',  'moderate', 'Irregular heart rhythm that may cause variability in heart rate.'),
    ('AST',  'Asthma',                '천식',          'respiratory',     'low',      'Mild airway constriction affecting exercise tolerance.'),
    ('SLP',  'Sleep Apnea',           '수면무호흡',    'respiratory',     'moderate', 'Sleep-disordered breathing that can worsen cardiovascular stress.'),
    ('none', 'None',                  '없음',          'general',         'none',     'No diagnosed medical conditions.'),
    ('CHO',  'High Cholesterol',      '고지혈증',      'metabolic',       'low',      'Elevated cholesterol levels contributing to cardiovascular risk.'),
    ('ATH',  'Arthritis',             '관절염',        'musculoskeletal', 'low',      'Joint discomfort reducing walking comfort and activity.'),
    ('THY',  'Thyroid Issue',         '갑상선 문제',   'endocrine',       'low',      'Thyroid condition affecting metabolism and energy levels.');

-- ---------------------------------------------------------------------
-- 3. 회원-질병관리테이블 (member_disease) — docs/user_disease_seed.csv
-- diag_seq는 BIGSERIAL(자동 채번)이라 별도 지정하지 않음
-- CSV상 diseaseid가 'none'(질환 없음)인 행(user_005, user_008)은 진단 이력이 아니므로 적재하지 않음
-- ---------------------------------------------------------------------
INSERT INTO member_disease (member_id, disease_id, diag_content, diag_date) VALUES
    ('user_003', 'HYP',  '고혈압과 당뇨가 동시에 있음',              '2018-03-20 00:00:00'),
    ('user_003', 'DIA',  '인슐린 저항성 관찰',                       '2019-06-10 00:00:00'),
    ('user_002', 'HYP',  '체중 증가와 함께 혈압 조절 필요',          '2021-08-15 00:00:00'),
    ('user_002', 'HYP',  '체중 증가와 함께 혈압 조절 필요',          '2025-08-15 00:00:00'),
    ('user_004', 'HYP',  '혈압·혈당 관리 중',                        '2016-11-02 00:00:00'),
    ('user_004', 'DIA',  '체중 감량 필요',                           '2017-04-12 00:00:00'),
    ('user_004', 'ARR',  '불규칙 심박 증가 관찰',                    '2020-01-25 00:00:00'),
    ('user_006', 'HYP',  '고령으로 인한 혈압 관리 중요',             '2014-09-30 00:00:00'),
    ('user_006', 'MI',   '심근경색 이력 있음',                       '2022-02-18 00:00:00'),
    ('user_006', 'ATH',  '관절염으로 보행량 감소',                   '2020-12-05 00:00:00'),
    ('user_007', 'AST',  '운동 시 호흡 조절 필요',                   '2017-07-21 00:00:00'),
    ('user_009', 'HYP',  '만성 고혈압',                              '2012-05-08 00:00:00'),
    ('user_009', 'DIA',  '당뇨 관리 중',                             '2015-10-04 00:00:00'),
    ('user_009', 'MI',   '심근경색 이력으로 심박 패턴 주의',         '2023-03-14 00:00:00'),
    ('user_009', 'SLP',  '수면무호흡 동반',                          '2020-08-19 00:00:00'),
    ('user_010', 'DIA',  '갑상선 관련 대사 변화 관찰',               '2021-01-30 00:00:00');
