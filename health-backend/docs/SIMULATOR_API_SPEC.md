# 시뮬레이터 API 명세서 — 외부 헬스케어 시뮬레이터 연동 (health-backend가 소비)

> **⚠️ 외부 API 안내**
> 본 문서는 우리 시스템이 제공하는 API가 아니라, **health-backend가 클라이언트로서 접속하여 데이터를 수신하는 외부 서버**(`healthsim.iranglab.com`)의 WebSocket 인터페이스 명세입니다. 회원의 실시간 건강정보(심박, 혈압, 체중, 걸음수, 혈당, 수면)는 이 외부 서버로부터 전달받습니다.
> health-backend가 프론트엔드(웹/앱)에 제공하는 자체 REST/WebSocket API는 [API_SPEC.md](./API_SPEC.md)(내부 API 명세)를 참고합니다.
> 원본 출처: `health-backend/docs/Health_interface.pdf`
> 값의 범위/생성 규칙 상세는 [../../docs/DATA_MODEL.md](../../docs/DATA_MODEL.md)의 "외부 데이터" 섹션을 참고합니다.

## 0. 공통 규칙

- Protocol: WebSocket (Socket.IO)
- Namespace: `/simulator`
- 모든 이벤트 페이로드는 `{ "event": "<이벤트명>", "data": { ... } }` 형태로 전달됨
- `timestamp` 필드는 항상 한국시간(KST, UTC+9) 기준, `+09:00` 오프셋의 ISO 8601 문자열 (예: `2026-07-03T22:07:15.541+09:00`)

## 1. 접속 방법

### 1.1 엔드포인트 & 인증

- 엔드포인트: `{ws|wss}://{server}/simulator`
- 인증은 별도 이벤트가 아니라 **연결(handshake) 시점의 쿼리 파라미터**로 이루어짐
  - `userId`: 사용자 고유 ID
  - `apiKey`: 해당 사용자의 API Key
  - 두 값 모두 우리 시스템 내부 회원관리테이블(`DATA_MODEL.md` 내부 데이터 › 1. 회원관리테이블 참고)에 저장·관리되며, 백엔드가 회원별 세션 연결 시 회원관리테이블에서 조회하여 쿼리 파라미터로 전달한다

```
wss://healthsim.iranglab.com/simulator?userId=user_001&apiKey=key_001
ws://localhost:10000/simulator?userId=user_001&apiKey=key_001
```

### 1.2 클라이언트 연동 예시 (Node.js, socket.io-client)

```js
const { io } = require('socket.io-client');

const socket = io('wss://healthsim.iranglab.com/simulator', {
  transports: ['websocket'], // polling 폴백 없이 websocket으로 고정
  query: { userId: 'user_001', apiKey: 'key_001' },
  reconnectionAttempts: 5,
  timeout: 5000,
});

socket.on('connect', () => console.log('connected', socket.id));
socket.on('userProfile', (msg) => console.log(msg));
socket.on('heartRate', (msg) => console.log(msg));
// stepCount, bloodPressure, weight, glucose, sleep 도 동일하게 socket.on(...)으로 구독
socket.on('error', (err) => console.error(err));
socket.on('disconnect', (reason) => console.log('disconnected:', reason));
```

> `transports: ['websocket']`을 지정하지 않으면 Socket.IO가 기본적으로 HTTP 롱폴링으로 먼저 시도한 뒤 업그레이드하므로, 초기 이벤트 수신이 지연될 수 있어 명시적으로 고정하는 것을 권장합니다.

### 1.3 연결 성공/실패 흐름

1. 클라이언트가 접속하면 서버가 `userId` / `apiKey`를 검증한다.
2. **실패 시**: `error` 이벤트(`{ code: "AUTH_FAILED", message: "Invalid userId or apiKey." }`)를 보낸 뒤 서버가 즉시 소켓 연결을 끊는다. (동일 자격증명으로 재시도해도 계속 실패)
3. **성공 시**: `userProfile` 이벤트를 1회 보낸 뒤, 곧바로 `weight` / `bloodPressure` / `glucose` / `sleep`을 각 1회 즉시 전송한다. 이어서 아래 주기로 반복 전송이 시작된다.

| 이벤트 | 주기 |
| --- | --- |
| heartRate | 4초 |
| stepCount | 4.5초 |
| bloodPressure | 2시간 |
| glucose | 1시간 |
| weight | 매일 08시 / 12시 / 18시 (KST) |
| sleep | 매일 기상 시각 (KST 07시) |

### 1.4 연결 해제 및 재접속

- 클라이언트 연결이 끊기면 서버가 해당 연결의 모든 타이머를 정리한다.
- **세션 상태는 저장되지 않는다.** 재접속 시 완전히 새 세션으로 시작되어 `stepCount`는 0부터, `weight` / `sleep`의 "오늘 이미 보냈는지" 여부도 초기화된다.
- 동일 `userId`로 여러 소켓을 동시에 연결하면 연결(`client.id`)마다 독립된 세션이 생성된다 — `stepCount` 누적치나 오늘 전송 여부가 서로 공유되지 않는다.
  - ⇒ 백엔드 연동 시 회원당 단일 커넥션을 유지하도록 설계해야 누적값 불일치를 피할 수 있다.

### 1.5 연결 상태 확인 (ping/pong)

클라이언트가 임의 데이터로 `ping`을 보내면 서버가 동일한 데이터를 `pong`으로 그대로 반환한다. 왕복 지연(RTT) 측정이나 연결 확인 용도로 사용한다.

```js
socket.emit('ping', { ts: Date.now() });
socket.on('pong', (msg) => console.log('rtt check', msg));
```

## 2. WebSocket 이벤트 목록

| 이벤트명 | 발생 시점 | 설명 |
| --- | --- | --- |
| [userProfile](#21-userprofile) | 연결 성공 직후 1회 | 회원 프로필 및 질환 정보 |
| [heartRate](#22-heartrate) | 4초 주기 (+ MI/HYP 보유자는 10분 주기 이상 이벤트) | 심박수 |
| [stepCount](#23-stepcount) | 4.5초 주기 | 당일 누적 걸음수 |
| [bloodPressure](#24-bloodpressure) | 접속 즉시 1회 + 2시간 주기 | 혈압 |
| [weight](#25-weight) | 접속 즉시 1회 + 매일 08/12/18시 | 체중, BMI, 체지방률, 골격근량 |
| [glucose](#26-glucose) | 접속 즉시 1회 + 1시간 주기 | 혈당 |
| [sleep](#27-sleep) | 접속 즉시 1회 + 매일 기상 시각(07시) | 수면 시간/품질 |
| [error](#28-error) | 인증 실패 시 | 인증 오류 |
| [pong](#29-pong) | `ping` 수신 시 | ping echo 응답 |

각 이벤트의 필드는 아래에 정리하며, **필드별 값 범위·산출 로직은 [DATA_MODEL.md](./DATA_MODEL.md)** 를 참고한다.

### 2.1 userProfile

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| userId | string | 사용자 ID |
| name | string | 이름 |
| age | number | 나이 |
| gender | "M" \| "F" | 성별 |
| heightCm | number | 키(cm) |
| weightKg | number | 체중(kg) |
| bmi | number | BMI |
| hypertension | boolean | 고혈압 보유 여부 |
| diabetes | boolean | 당뇨병 보유 여부 |
| heartDisease | "myocardial_infarction" \| "arrhythmia" \| null | 심장질환 종류 |
| diseases | Array<{diseaseCode, name, nameKr}> | 보유한 모든 질환 매핑 |
| otherConditions | string[] | 그 외 보유 질환 코드 목록 |

```json
{
  "event": "userProfile",
  "data": {
    "userId": "user_003",
    "name": "박지훈",
    "age": 45,
    "gender": "M",
    "heightCm": 172,
    "weightKg": 88,
    "bmi": 29.8,
    "hypertension": true,
    "diabetes": true,
    "heartDisease": null,
    "diseases": [
      { "diseaseCode": "HYP", "name": "Hypertension", "nameKr": "고혈압" },
      { "diseaseCode": "DIA", "name": "Diabetes", "nameKr": "당뇨병" }
    ],
    "otherConditions": []
  }
}
```

### 2.2 heartRate

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| timestamp | string | KST ISO 8601 |
| userId | string | 사용자 ID |
| heartRate | number | 심박수 (bpm) |
| source | "simulation" \| "abnormal_event" | 일반 생성값인지 이상 이벤트인지 구분 |
| note | string? | `source`가 `abnormal_event`일 때만 존재. 고정값 `"Possible tachycardia detected."` |

```json
{ "event": "heartRate", "data": { "timestamp": "2026-07-03T22:07:15.541+09:00", "userId": "user_003", "heartRate": 78, "source": "simulation" } }
```

### 2.3 stepCount

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| timestamp | string | KST ISO 8601 |
| userId | string | 사용자 ID |
| stepCount | number | 해당 일자 누적 걸음 수 |
| dailyReset | boolean | 이번 틱에서 날짜가 바뀌어 0으로 초기화되었는지 여부 |

```json
{ "event": "stepCount", "data": { "timestamp": "2026-07-03T22:07:15.541+09:00", "userId": "user_003", "stepCount": 4231, "dailyReset": false } }
```

### 2.4 bloodPressure

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| timestamp | string | KST ISO 8601 |
| userId | string | 사용자 ID |
| systolic | number | 수축기 혈압 (mmHg) |
| diastolic | number | 이완기 혈압 (mmHg) |
| source | string | 항상 `"simulation"` |

```json
{ "event": "bloodPressure", "data": { "timestamp": "2026-07-03T22:07:15.541+09:00", "userId": "user_003", "systolic": 138, "diastolic": 88, "source": "simulation" } }
```

> API 명세상 `bloodPressure` 이벤트 자체에는 "혈압상태" 필드가 없다. 정상/이상 상태는 수축기·이완기 값으로부터 클라이언트(백엔드)가 판정해야 한다.

### 2.5 weight

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| timestamp | string | KST ISO 8601 |
| userId | string | 사용자 ID |
| weightKg | number | 체중(kg) — `userProfile`과 동일 값(세션 중 고정) |
| bmi | number | BMI — `userProfile`과 동일 값 |
| skeletalMuscleMassKg | number | 골격근량(kg), 매 전송 시점마다 재계산 |
| bodyFatPercentage | number | 체지방률(%), 매 전송 시점마다 재계산 |
| source | string | 항상 `"simulation"` |

```json
{ "event": "weight", "data": { "timestamp": "2026-07-03T22:07:15.541+09:00", "userId": "user_003", "weightKg": 88, "bmi": 29.8, "skeletalMuscleMassKg": 34.2, "bodyFatPercentage": 24.1, "source": "simulation" } }
```

### 2.6 glucose

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| timestamp | string | KST ISO 8601 |
| userId | string | 사용자 ID |
| glucoseMgDl | number | 혈당(mg/dL) |
| status | "normal" \| "elevated" \| "high" | 140 이상 high, 110~139 elevated, 그 미만 normal |
| source | string | 항상 `"simulation"` |

```json
{ "event": "glucose", "data": { "timestamp": "2026-07-03T22:07:15.541+09:00", "userId": "user_003", "glucoseMgDl": 128, "status": "elevated", "source": "simulation" } }
```

### 2.7 sleep

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| timestamp | string | KST ISO 8601 |
| userId | string | 사용자 ID |
| sleepHours | number | 수면 시간(시간 단위, 소수 첫째 자리) |
| quality | "good" \| "fair" \| "poor" | 수면 품질 |
| bedTime | string | 취침 시각(KST) |
| wakeTime | string | 기상 시각(KST), 매일 07:00 고정 |
| source | string | 항상 `"simulation"` |

```json
{ "event": "sleep", "data": { "timestamp": "2026-07-03T07:00:00.000+09:00", "userId": "user_003", "sleepHours": 6.8, "quality": "fair", "bedTime": "2026-07-03T00:12:00.000+09:00", "wakeTime": "2026-07-03T07:00:00.000+09:00", "source": "simulation" } }
```

### 2.8 error

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| code | string | 고정값 `"AUTH_FAILED"` |
| message | string | 고정 문구 `"Invalid userId or apiKey."` |

```json
{ "event": "error", "data": { "code": "AUTH_FAILED", "message": "Invalid userId or apiKey." } }
```

인증 실패 시 이 이벤트 전송 직후 서버가 소켓 연결을 강제 종료한다.

### 2.9 pong

발생 시점: 클라이언트가 `ping` 이벤트를 보낼 때 그대로 echo.
페이로드: 클라이언트가 보낸 `data`를 그대로 반환 (`{ event: 'pong', data }`)
