# API 명세서 — health-backend가 웹·앱에 제공하는 내부 API

> 본 문서는 health-backend(NestJS)가 프론트엔드(React 웹, React Native 앱)에 제공하는 **자체 REST/WebSocket API** 명세입니다.
> health-backend가 외부 시뮬레이터 서버에 클라이언트로 접속하는 스펙은 [SIMULATOR_API_SPEC.md](./SIMULATOR_API_SPEC.md)를 참고합니다.
> 데이터 계약(테이블 구조, 이상치 판정 기준)은 [../../docs/DATA_MODEL.md](../../docs/DATA_MODEL.md), 전체 흐름은 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고합니다.

## 0. 공통 규칙

- Base URL: `http://{host}:{PORT}` (`.env`의 `PORT`)
- 인증이 필요한 API는 `Authorization: Bearer {AccessToken}` 헤더로 호출한다.
- AccessToken(JWT) Payload: `{ userId, name, apiKey }`
- 날짜/시간은 KST(UTC+9), ISO 8601 문자열로 주고받는다.
- 회원유형에 따른 접근 제어: `PAT`(환자)는 자기 자신의 데이터만, `DOC`(의사)는 전체 회원 데이터에 접근 가능. AccessToken의 `userId`로 회원유형을 조회해 판정한다.

### 0.1 아키텍처 원칙 — 클라이언트는 오직 health-backend와만 통신한다

- **웹/앱 클라이언트는 외부 시뮬레이터 서버(`healthsim.iranglab.com`)에 절대 직접 접속하지 않는다.** 시뮬레이터와의 WebSocket 연결(`SIMULATOR_API_SPEC.md`)은 health-backend의 `simulator-client` 모듈만 보유하며, 수신 즉시 DB에 1차 저장한다.
- 클라이언트가 실시간 데이터를 받는 경로는 오직 health-backend가 제공하는 2장의 WebSocket(`/health` 네임스페이스) 하나뿐이다. 시뮬레이터의 `apiKey`나 엔드포인트는 클라이언트에 노출되지 않는다.
- 클라이언트의 표준 데이터 취득 흐름은 항상 아래 2단계다.
  1. **REST 조회** (`GET /members/:memberId`, 1.4) — DB에 저장된 가장 최근 데이터까지 조회해 초기 화면/그래프를 그린다.
  2. **WebSocket 구독** (2장) — 1단계 조회에 이어서 즉시 소켓에 연결·구독해, 그 이후 발생하는 데이터만 실시간으로 이어받는다. (WS는 과거 데이터를 재전송하지 않음 — 중복 수신 방지)

## 1. REST API

### 1.1 회원 로그인

| 항목 | 내용 |
| --- | --- |
| Method / Path | `POST /auth/login` |
| 인증 | 불필요 |
| 설명 | ID/Password 인증 후 AccessToken, RefreshToken, 회원정보를 발급 |

요청

```json
{ "id": "user_003", "passwd": "P@ssw0rd" }
```

응답 (성공)

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "member": {
    "memberId": "user_003",
    "name": "박지훈",
    "gender": "M",
    "birthDate": "19810512",
    "memberType": "PAT",
    "diseases": [{ "diseaseId": "HYP", "nameKr": "고혈압" }]
  }
}
```

- AccessToken Payload: `{ "userId": "user_003", "name": "박지훈", "apiKey": "key_003" }`
- 실패(ID/Password 불일치) 시 `401 Unauthorized`.

### 1.2 AccessToken 재발급

| 항목 | 내용 |
| --- | --- |
| Method / Path | `POST /auth/refresh` |
| 인증 | 불필요 (RefreshToken 자체가 인증 수단) |
| 설명 | 만료된 AccessToken을 RefreshToken으로 재발급 |

요청

```json
{ "refreshToken": "eyJhbGciOi..." }
```

응답

```json
{ "accessToken": "eyJhbGciOi..." }
```

- RefreshToken이 유효하지 않거나 만료된 경우 `401 Unauthorized` (재로그인 필요).

### 1.3 회원 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method / Path | `GET /members` |
| 인증 | 필요 |
| 설명 | 요청자의 회원유형에 따라 목록 범위가 달라짐 |

- 전송값(요청자 회원아이디/회원유형)은 별도 바디 없이 AccessToken에서 추출한다.
- 의사(`DOC`)로 조회 시: 전체 회원 목록 반환. 이름/성별 검색을 위한 선택적 쿼리 파라미터 제공 (`?name=&gender=`).
- 환자(`PAT`)로 조회 시: 본인 정보만 담긴 목록(1건) 반환.

응답

```json
{
  "members": [
    { "memberId": "user_003", "name": "박지훈", "gender": "M", "birthDate": "19810512" }
  ]
}
```

### 1.4 회원 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method / Path | `GET /members/:memberId` |
| 인증 | 필요 (환자는 본인 `memberId`만 조회 가능) |
| 설명 | 회원 기본정보 + 최근 7일간 건강데이터(체중/혈압 포함 5종) 조회 |

응답

```json
{
  "member": {
    "memberId": "user_003",
    "name": "박지훈",
    "gender": "M",
    "birthDate": "19810512",
    "diseases": [{ "diseaseId": "HYP", "nameKr": "고혈압" }],
    "memo": null
  },
  "recentHealthData": {
    "bodyWeight": [{ "weightKg": 88, "bmi": 29.8, "measuredAt": "2026-07-15T08:00:00+09:00" }],
    "bloodPressure": [{ "systolic": 138, "diastolic": 88, "status": "주의", "measuredAt": "2026-07-15T22:00:00+09:00" }],
    "heartRate": [{ "heartRate": 78, "status": "정상", "measuredAt": "2026-07-15T22:07:15+09:00" }],
    "glucose": [{ "glucoseValue": 128, "status": "elevated", "measuredAt": "2026-07-15T14:00:00+09:00" }],
    "stepCount": [{ "totalSteps": 4231, "measuredAt": "2026-07-15T22:07:15+09:00" }]
  }
}
```

- `recentHealthData`의 각 배열은 측정일시(`measuredAt`) 오름차순으로 정렬되며, `HEALTH_DATA_RETENTION_DAYS`(기본 7일) 이내 데이터만 포함한다 (DB 보관 정책상 이 기간을 넘는 데이터는 존재하지 않음).
- **표준 흐름(0.1 참고)**: 회원 상세화면 진입 시 이 API를 먼저 호출해 DB에 쌓인 가장 최근 데이터까지로 그래프를 초기화하고, 응답 즉시 2장의 WebSocket에 동일 `memberId`로 연결·구독한다. 이후 신규로 발생하는 값만 WS로 이어받으므로 이 API를 반복 폴링할 필요가 없다.

### 1.5 회원 건강데이터 조회 (혈압, 혈당, 심박 등)

| 항목 | 내용 |
| --- | --- |
| Method / Path | `GET /members/:memberId/health-data` |
| 인증 | 필요 (환자는 본인 `memberId`만 조회 가능) |
| 설명 | 지정 기간의 건강데이터 이력을 전체 조회 (그래프 조회 등 상세 분석용) |

요청 (Query String)

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `startAt` | Y | 조회 시작일시 (ISO 8601) |
| `endAt` | Y | 조회 종료일시 (ISO 8601) |

응답

```json
{
  "heartRate": [{ "heartRate": 78, "status": "정상", "remark": null, "measuredAt": "2026-07-15T22:07:15+09:00" }],
  "bloodPressure": [{ "systolic": 138, "diastolic": 88, "status": "주의", "measuredAt": "2026-07-15T22:00:00+09:00" }],
  "bodyWeight": [{ "weightKg": 88, "bmi": 29.8, "skeletalMuscleMassKg": 34.2, "bodyFatPercentage": 24.1, "measuredAt": "2026-07-15T08:00:00+09:00" }],
  "glucose": [{ "glucoseValue": 128, "status": "elevated", "measuredAt": "2026-07-15T14:00:00+09:00" }],
  "stepCount": [{ "totalSteps": 4231, "measuredAt": "2026-07-15T22:07:15+09:00" }]
}
```

- 지정 기간(`startAt`~`endAt`) 내 데이터를 5종 테이블 각각에서 조건에 맞는 전체 로우로 반환한다 (DB 보관 정책상 최대 7일 이내 범위만 존재).

### 1.6 채팅 API (AI Agent 프록시)

| 항목 | 내용 |
| --- | --- |
| Method / Path | `POST /chat` |
| 인증 | 필요 |
| 설명 | 질의 내용을 AI Agent API(health-ai)로 프록시하고 답변을 그대로 전달 |

요청

```json
{ "message": "이 환자의 최근 혈압 추이가 어때?" }
```

응답

```json
{ "reply": "최근 7일간 수축기 혈압이 132~145mmHg 사이로 다소 높은 편입니다..." }
```

- health-backend는 인증만 검증하고, 질의/응답 내용에 대한 가공 없이 AI Agent API(`AI_AGENT_API_URL`)에 그대로 프록시한다.

### 1.7 웹훅 메시지 API (Slack 알림 발송)

| 항목 | 내용 |
| --- | --- |
| Method / Path | `POST /webhook/message` |
| 인증 | 필요 |
| 설명 | 전달받은 메시지를 Slack Incoming Webhook(`SLACK_WEBHOOK_URL`)으로 발송 |

요청

```json
{ "message": "[이상감지] user_003 박지훈 - 심박수 132bpm (기준치 초과)" }
```

응답

```json
{ "sent": true, "sentAt": "2026-07-15T22:07:16+09:00" }
```

- ALM(이상 데이터 감지) 모듈이 내부적으로 호출하는 것이 기본 사용처이며, 관리자가 수동으로 알림을 보내는 용도로도 재사용한다.
- 발송 실패 시 `sent: false`와 함께 `500` 응답, 로그(winston)에 실패 사유를 남긴다.

## 2. WebSocket 인터페이스 (실시간 건강정보 push)

> 이벤트 종류와 필드 구성은 `Health_interface.pdf`(→ [SIMULATOR_API_SPEC.md](./SIMULATOR_API_SPEC.md))에서 정의된 시뮬레이터 이벤트 구조를 그대로 따르되, 인증 방식만 시뮬레이터의 `apiKey` 대신 프론트엔드의 **AccessToken(JWT)** 로 대체한다. health-backend가 시뮬레이터로부터 수신·DB 저장한 데이터를 동일한 형태로 프론트엔드에 relay하며, 시뮬레이터가 보내는 원본 이벤트를 그대로 중계하는 것이 아니라 **DB에 저장된 이후의 값**을 내려준다.
>
> 1.4(회원 상세 조회)로 최근 데이터를 조회한 직후 곧바로 연결하는 것이 표준 흐름이다 (0.1 참고).

### 2.1 접속 방법

- Protocol: WebSocket (Socket.IO), Namespace: `/health`
- 인증: 연결(handshake) 시점의 쿼리 파라미터 또는 `auth` 옵션으로 AccessToken 전달

```js
const socket = io('ws://{host}:{PORT}/health', {
  transports: ['websocket'],
  auth: { token: accessToken },
});
```

- 인증 실패(토큰 없음/만료) 시 `error` 이벤트(`{ code: "AUTH_FAILED" }`) 후 연결 종료.

### 2.2 구독

연결 성공 후, 클라이언트가 보고자 하는 회원의 실시간 데이터를 구독한다.

```js
socket.emit('subscribe', { memberId: 'user_003' });
```

- 환자 계정으로 접속한 경우 자기 자신의 `memberId`만 구독 가능. 의사 계정은 임의 회원의 `memberId`를 구독 가능.
- 권한이 없는 `memberId`를 구독 시도하면 `error` 이벤트(`{ code: "FORBIDDEN" }`)를 반환한다.

### 2.3 이벤트 목록

시뮬레이터 이벤트(SIMULATOR_API_SPEC.md 2장)와 동일한 이름/필드 구조로 push한다. 필드별 값 범위·산출 로직은 [../../docs/DATA_MODEL.md](../../docs/DATA_MODEL.md)를 참고.

| 이벤트명 | 설명 |
| --- | --- |
| `heartRate` | 심박수 (`{ memberId, heartRate, status, measuredAt }`) |
| `bloodPressure` | 혈압 (`{ memberId, systolic, diastolic, status, measuredAt }`) |
| `bodyWeight` | 체중/BMI/골격근량/체지방률 (`{ memberId, weightKg, bmi, skeletalMuscleMassKg, bodyFatPercentage, measuredAt }`) |
| `glucose` | 혈당 (`{ memberId, glucoseValue, status, measuredAt }`) |
| `stepCount` | 누적 걸음수 (`{ memberId, totalSteps, measuredAt }`) |

```json
{ "event": "heartRate", "data": { "memberId": "user_003", "heartRate": 78, "status": "정상", "measuredAt": "2026-07-15T22:07:15+09:00" } }
```

- `status`는 health-backend가 저장 시점에 판정한 값([DATA_MODEL.md](../../docs/DATA_MODEL.md) 기준)이며, 외부 시뮬레이터 원본 이벤트와 달리 이미 판정이 끝난 상태로 내려간다.

### 2.4 연결 상태 확인 (ping/pong)

시뮬레이터 연동과 동일하게 지원한다.

```js
socket.emit('ping', { ts: Date.now() });
socket.on('pong', (msg) => console.log('rtt check', msg));
```

## 3. 관련 문서

| 문서 | 내용 |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | health-backend 전체 아키텍처 |
| [SIMULATOR_API_SPEC.md](./SIMULATOR_API_SPEC.md) | 외부 시뮬레이터 WebSocket 프로토콜 (health-backend가 소비) |
| [Health_interface.pdf](./Health_interface.pdf) | 시뮬레이터 인터페이스 원본 문서 |
| [../../docs/DATA_MODEL.md](../../docs/DATA_MODEL.md) | 내부/외부 데이터 모델, 이상치 판정 기준 |
| [../../docs/REQUIREMENTS.md](../../docs/REQUIREMENTS.md) | 전체 기능 요구사항 |
