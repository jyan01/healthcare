# 시스템 아키텍처 — 실습용 시스템 구성도

> 본 문서는 프로젝트의 전체 시스템 구조와 흐름을 정의한다. "사전준비"(설계) 단계와 "실습"(구현) 단계로 구분되며, 외부 시뮬레이터로부터 실시간 건강정보를 수신해 웹/모바일 클라이언트에 노출하고, AI Agent(RAG + 로컬 LLM)를 통해 챗봇 응답과 이상징후 Slack 알림을 제공하는 구조다.

## 범례

| 표시 | 의미 |
| --- | --- |
| 실선 화살표 (→) | 주요 흐름 |
| 점선 화살표 (‥▶) | 실시간 통신 / 연동 |
| 대시 화살표 (- - ▶) | 인프라 / 배포 영역 |
| `API-1` ~ `API-2` | NestJS가 제공/호출하는 API 구분 번호 |

## 전체 구성도

```
[사전준비]                              [실습]
1. 시스템 설계 및 구축 준비        3. 시뮬레이터 서버(외부, 실시간 건강정보 전송)
   요구사항 확인 → 화면설계 → ERD/테이블 설계     │
        │                                        ▼
        ▼                              4-1. NestJS 백엔드 (DATA / ALM / API-1 / API-2)
2. AI Agent 백엔드 구성 (RAG, Ollama)  ◀‥‥▶  (API-1)     │
        │                                        ▼
        └────────────────────────────▶  4-2. React + Vite 웹 서비스 (AUTH/LIST/VIEW/CHAT)
                                                  │             ↕ (같은 API-2 공유)
                                                  ▼             ▼
                                        5. Slack(웹훅) — 이상증상 LLM 분석 전송
                                                                7. React Native(Expo) 앱
                                                                   (로그인/회원목록/회원상세/챗봇)

6. 서버배포 및 네트워크 인프라 구성 — 4-2, 7을 클라우드에 배포 (인프라/배포 영역)
```

## 구성 요소

### 사전준비 단계

#### 1. 시스템 설계 및 구축 준비

좌→우 순차 진행:

| 단계 | 내용 | 관련 문서 |
| --- | --- | --- |
| 요구사항 확인 | 서비스 기능 및 비기능 요구사항 정의 | [REQUIREMENTS.md](./REQUIREMENTS.md) |
| 화면설계 | 화면 구조 및 UI/UX 설계 | [SCREEN_DESIGN.md](./SCREEN_DESIGN.md), [DESIGN-apple.md](./DESIGN-apple.md) |
| ERD 작성 및 테이블 설계/생성 | ERD 작성 후 테이블 설계 및 생성 | [DATA_MODEL.md](./DATA_MODEL.md), [table.sql](./table.sql) |

#### 2. AI Agent 백엔드 구성

| 구성 요소 | 내용 |
| --- | --- |
| RAG | 문서/데이터 검색 및 벡터 기반 조회 |
| Ollama 로컬 LLM | qwen2.5:3b 모델 로컬 실행 |
| AI Agent API (Python) | RAG + LLM 연동, 프롬프트/컨텍스트 관리, AI Agent API 제공 |

RAG와 Ollama 로컬 LLM은 모두 AI Agent API(Python)와 연동되며, 이 API가 실습 단계의 NestJS 백엔드(4-1)와 React+Vite 웹서비스(4-2)의 챗봇 기능에 실시간으로 연동된다.

### 실습(구현) 단계

#### 3. 시뮬레이터 서버 (외부)

회원 건강정보(심박, 혈압, 체중, 혈당, 걸음수, 수면 등)를 실시간으로 전송하는 외부 서버. 우리 시스템이 소유하지 않으며, NestJS 백엔드(4-1)가 클라이언트로서 접속해 데이터를 수신한다.
관련 문서: [health-backend/docs/SIMULATOR_API_SPEC.md](../health-backend/docs/SIMULATOR_API_SPEC.md), [DATA_MODEL.md](./DATA_MODEL.md)(외부 데이터 섹션)

#### 4-1. NestJS 백엔드

| 구분 | 기능 |
| --- | --- |
| DATA | 건강데이터 수신 (시뮬레이터 서버로부터) |
| ALM | 실시간 모니터링 알람 (이상 데이터 감지) |
| API-1 | AI Agent API 연동 (Python API 호출) |
| API-2 | 건강데이터 제공 API (웹/앱 클라이언트 대상) |

수신한 건강데이터는 [DATA_MODEL.md](./DATA_MODEL.md) 내부 데이터 스키마([table.sql](./table.sql))에 저장되고, 이상 데이터 감지 시 API-1을 통해 AI Agent API를 호출해 분석을 요청한다.

#### 4-2. React + Vite 웹 서비스

| 구분 | 기능 |
| --- | --- |
| AUTH | 로그인 |
| LIST | 회원목록 |
| VIEW | 회원상세 (실시간 모니터링) |
| CHAT | 챗봇 — AI Agent API 연동 (Python API 호출) |

NestJS 백엔드(4-1)의 API-2를 통해 데이터를 받으며, 챗봇(CHAT)은 NestJS를 거치지 않고 AI Agent API를 직접 호출한다.

#### 5. Slack (웹훅)

실시간 모니터링(ALM)에서 이상 증상이 감지되면, AI Agent(LLM)가 분석한 내용을 Slack 웹훅으로 관리자에게 전송한다. ([REQUIREMENTS.md](./REQUIREMENTS.md)의 "알림 기능" 대응)

#### 6. 서버배포 및 네트워크 인프라 구성

React + Vite 웹서비스(4-2)와 React Native 앱(7)을 클라우드 서버에 배포하고, 네트워크·보안 등 인프라를 구성하는 영역.

- 배포는 **GitHub Actions**를 통해 이루어진다 (CI/CD 파이프라인).
- 저장소에 push/merge되면 GitHub Actions 워크플로우가 빌드 후 클라우드 서버로 배포한다.

#### 7. React Native (Expo) 앱

| 화면 | 내용 |
| --- | --- |
| 로그인 | 인증 |
| 회원목록 | 등록된 회원 목록 조회 |
| 회원상세 | 실시간 모니터링 |
| 챗봇 | AI Agent API 연동 |

React + Vite 웹서비스(4-2)와 동일한 NestJS API(API-2)를 공유하는 별도 클라이언트다.

## 전체 흐름 요약

1. **(사전준비)** 요구사항 확인 → 화면설계 → ERD/테이블 설계 순으로 설계 산출물을 만든다.
2. **(사전준비)** AI Agent 백엔드(RAG + Ollama 로컬 LLM)를 Python으로 구성해 AI Agent API를 제공한다.
3. 외부 시뮬레이터 서버가 회원 건강정보를 실시간(WebSocket)으로 NestJS 백엔드(4-1)에 전송한다.
4. NestJS 백엔드는 수신 데이터를 저장하고, 이상 데이터 감지 시(ALM) AI Agent API(API-1)를 호출해 LLM 분석 결과를 받아 Slack(5)으로 전송한다.
5. NestJS 백엔드는 건강데이터 제공 API(API-2)로 React+Vite 웹서비스(4-2)와 React Native 앱(7)에 동일한 데이터를 제공한다.
6. 웹/앱 클라이언트는 로그인·회원목록·회원상세(실시간 모니터링)·챗봇 화면을 제공하며, 챗봇은 AI Agent API를 직접 호출해 응답을 받는다.
7. React+Vite 웹서비스와 React Native 앱은 GitHub Actions(CI/CD)를 통해 클라우드 인프라(6)에 배포된다.

## 관련 문서

| 문서 | 내용 |
| --- | --- |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | 기능 요구사항 |
| [SCREEN_DESIGN.md](./SCREEN_DESIGN.md) / [DESIGN-apple.md](./DESIGN-apple.md) | 화면 설계 |
| [DATA_MODEL.md](./DATA_MODEL.md) | ERD 기반 내부/외부 데이터 모델 |
| [health-backend/docs/SIMULATOR_API_SPEC.md](../health-backend/docs/SIMULATOR_API_SPEC.md) | 외부 시뮬레이터 WebSocket 프로토콜 (health-backend가 소비) |
| [health-backend/docs/API_SPEC.md](../health-backend/docs/API_SPEC.md) | health-backend가 웹·앱에 제공하는 내부 REST/WebSocket API |
| [table.sql](./table.sql) / [insert.sql](./insert.sql) | PostgreSQL 테이블 생성 및 초기 데이터 스크립트 |
