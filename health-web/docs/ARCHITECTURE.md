# health-web 아키텍처

> health-web(React + Vite 웹)의 구현 설계 문서. 기술스택·폴더구조·데이터 흐름 결정을 다룬다.
> 화면 명세는 [../../docs/SCREEN_DESIGN.md](../../docs/SCREEN_DESIGN.md), 디자인 가이드는 [../../docs/DESIGN-apple.md](../../docs/DESIGN-apple.md), API 명세는 [../../health-backend/docs/API_SPEC.md](../../health-backend/docs/API_SPEC.md)를 참고한다.

## 1. 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | React (최신 버전 유지, 19.x) + TypeScript |
| 빌드 도구 | Vite |
| 라우팅 | react-router-dom |
| REST 클라이언트 | axios |
| 실시간 통신 | socket.io-client |
| 스타일 | CSS Modules |

React 버전은 임의로 다운그레이드하지 않고 항상 최신 안정 버전을 유지한다.

## 2. 폴더 구조

```
health-web/
├── docs/
│   ├── ARCHITECTURE.md   # 본 문서
│   └── TASKS.md          # 작업 목록
├── public/
├── src/
│   ├── assets/
│   ├── pages/            # 라우트 단위 화면 (로그인/회원목록/회원상세/AI 상담)
│   ├── components/       # 재사용 UI 컴포넌트 (각 컴포넌트 옆 *.module.css)
│   ├── api/               # axios 인스턴스, REST 호출 함수
│   ├── realtime/          # socket.io-client 연결/구독 관리
│   ├── routes/            # react-router-dom 라우트 정의
│   ├── App.tsx
│   └── main.tsx
├── .env.development       # dev 환경 변수 (backend: 127.0.0.1)
├── .env.production        # 상용 환경 변수 (backend: 172.27.0.192)
└── vite.config.ts
```

- 타입과 공통 순수 로직은 로컬(`src/`)에 재정의하지 않고 [`../../shared/types.ts`](../../shared/types.ts), [`../../shared/utils.ts`](../../shared/utils.ts)를 사용한다. 공유가 필요한 새 타입/순수 함수는 `shared/`에 추가·업데이트한다.

## 3. 환경설정 (.env)

Backend 접속 정보와 웹 서버 포트는 코드에 하드코딩하지 않고 `.env` 파일로 분리한다. health-backend는 같은 서버에 컨테이너로 배포되며, 환경별 접속 정보는 다음과 같다.

| 환경 | 파일 | Backend Host |
| --- | --- | --- |
| dev | `.env.development` | `127.0.0.1` |
| 상용 | `.env.production` | `172.27.0.192` |

```
# .env.development
VITE_API_BASE_URL=http://127.0.0.1:21018
VITE_WS_URL=ws://127.0.0.1:21018
VITE_DEV_SERVER_PORT=5173

# .env.production
VITE_API_BASE_URL=http://172.27.0.192:21018
VITE_WS_URL=ws://172.27.0.192:21018
```

- `VITE_DEV_SERVER_PORT`는 `vite.config.ts`의 `server.port`에 연결되어 dev 서버 포트를 결정한다.
- health-backend는 이 오리진들(`http://localhost:5173`, `http://fe018.ys.iranglab.com`)을 CORS 허용 목록(`CORS_ORIGINS`)에 등록해 두었다 (`health-backend/.env` 참고).

## 4. 인증

- 인증 방식: JWT. 로그인 성공 시 health-backend가 AccessToken/RefreshToken을 발급한다 ([API_SPEC.md](../../health-backend/docs/API_SPEC.md) 1.1).
- AccessToken: 메모리(앱 상태)에 보관해 `Authorization: Bearer` 헤더로 API 호출.
- RefreshToken: **쿠키**에 저장한다. health-backend가 `Set-Cookie`로 내려주는 httpOnly 쿠키를 브라우저가 자동 관리하며, 프론트엔드 코드는 RefreshToken 값을 직접 다루지 않는다.
- 쿠키 기반 인증이 동작하려면 axios 요청에 `withCredentials: true`가 필요하고, health-backend CORS 설정도 와일드카드가 아닌 명시적 오리진 + `credentials: true`여야 한다 (3장, health-backend `.env`의 `CORS_ORIGINS` 참고).
- AccessToken 만료 시 `POST /auth/refresh`로 재발급받는다 (API_SPEC.md 1.2).

## 5. 데이터 흐름

### 5.1 인증 흐름

1. 로그인 화면에서 `POST /auth/login` 호출 → AccessToken(메모리) + RefreshToken(쿠키) 수신.
2. 이후 모든 REST 호출에 AccessToken을 `Authorization` 헤더로 첨부.
3. `401` 응답 수신 시 `POST /auth/refresh`로 AccessToken 재발급 후 원 요청 재시도. RefreshToken 자체가 만료/무효면 로그인 화면으로 이동.

### 5.2 회원 목록 조회 (REST)

- 의사 계정: `GET /members` 호출로 전체 회원 목록을 받아 검색(이름/성별) 후 렌더링.
- 환자 계정: 목록 화면을 거치지 않고 곧바로 본인 상세화면으로 이동.

### 5.3 실시간 건강데이터 구독 — "REST 최초 로드 → WebSocket 구독 전환"

회원 상세화면의 건강데이터는 반드시 아래 2단계 패턴을 따른다. **polling 등 다른 방식은 임의로 사용하지 않는다.**

1. **REST 최초 로드**: 화면 진입 시 `GET /members/:memberId`를 호출해 DB에 저장된 가장 최근 데이터까지 조회, 그래프/카드를 초기 렌더링한다 ([API_SPEC.md](../../health-backend/docs/API_SPEC.md) 1.4).
2. **WebSocket 구독 전환**: REST 응답을 받는 즉시 socket.io-client로 health-backend의 `/health` 네임스페이스에 연결하고, 동일 `memberId`를 `subscribe` 이벤트로 구독한다. 이후 신규로 발생하는 값만 실시간으로 이어받아 화면에 반영한다 (WS는 과거 데이터를 재전송하지 않으므로 REST 재조회/폴링이 불필요하다).

```js
const socket = io(`${import.meta.env.VITE_WS_URL}/health`, {
  transports: ['websocket'],
  auth: { token: accessToken },
});
socket.emit('subscribe', { memberId });
```

- 화면을 벗어나거나 대상 회원이 바뀌면 기존 소켓 연결을 정리(disconnect)하고, 새 회원에 대해 1~2단계를 다시 수행한다.
- 이벤트 종류/필드는 [API_SPEC.md](../../health-backend/docs/API_SPEC.md) 2장을 따른다.

## 6. 스타일 가이드

- 컴포넌트 스타일은 **CSS Modules**(`*.module.css`)로 작성한다.
- 색상·간격·폰트·버튼·카드·입력폼·레이아웃 등 디자인 토큰/규칙은 [../../docs/DESIGN-apple.md](../../docs/DESIGN-apple.md)를 그대로 따르며, 화면별로 임의의 새 스타일 규칙을 만들지 않는다.

## 7. 관련 문서

| 문서 | 내용 |
| --- | --- |
| [TASKS.md](./TASKS.md) | health-web 작업 목록 |
| [../../docs/SCREEN_DESIGN.md](../../docs/SCREEN_DESIGN.md) | 화면 명세 |
| [../../docs/DESIGN-apple.md](../../docs/DESIGN-apple.md) | 디자인 가이드 |
| [../../health-backend/docs/API_SPEC.md](../../health-backend/docs/API_SPEC.md) | health-backend REST/WebSocket API 명세 |
| [../../shared/types.ts](../../shared/types.ts) | 공유 타입 |
