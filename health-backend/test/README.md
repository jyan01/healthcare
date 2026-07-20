# health-backend 테스트 가이드

health-backend API를 테스트하는 4가지 방법을 정리한다. 어떤 방법이든 먼저 서버가 실행 중이어야 한다 (아래 "사전 준비" 참고).

## 사전 준비

```bash
cd health-backend
npm install
npm run start:dev
```

- `.env`의 `PORT`(기본 `21018`)로 서버가 뜬다. 이 문서의 예시는 모두 `http://localhost:21018` 기준.
- `.env`의 `DB_*`는 실제 운영 DB(`211.253.27.76/db18`)를 그대로 가리키므로 별도 DB 세팅이 필요 없다. 시드된 테스트 계정:

| 구분 | ID | 비밀번호 | memberType |
| --- | --- | --- | --- |
| 의사 | `admin` | `admin001123!` | `D` |
| 환자 | `user_003` | `user_003123!` | `P` |
| 환자(타인, 403 테스트용) | `user_004` | `user_004123!` | `P` |

- ⚠️ 서버가 뜨면 `SimulatorClientService`가 환자 10명 전원의 실제 시뮬레이터(healthsim.iranglab.com) 커넥션을 즉시 연다. 이상 데이터가 감지되면 `.env`의 `SLACK_WEBHOOK_URL`로 **실제 Slack 알림이 발송**된다. `/webhook/message` API도 마찬가지로 실제 메시지를 보내니 테스트 시 주의한다.
- health-ai(AI Agent API)가 아직 없다면 `/chat` 호출은 500 에러가 정상이다 (프록시 대상 서버 부재).

## 1. REST Client (.http) + Swagger

### REST Client

VS Code의 **[REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)** 확장을 설치한 뒤 [`test/http/health-backend.http`](./http/health-backend.http)를 연다.

- 각 요청 위의 `### 번호. 설명` 줄 바로 아래 "Send Request" 링크를 클릭하거나, 요청 블록 안에 커서를 두고 `Ctrl+Alt+R`(Mac: `Cmd+Alt+R`).
- 로그인(1, 2번) 요청을 먼저 실행하면 응답의 `accessToken`/`refreshToken`이 `{{doctorLogin.response.body.$.accessToken}}` 문법으로 이후 요청에 자동 대입된다. **순서대로 실행**해야 한다.
- 12번(웹훅 발송)은 실제 Slack으로 메시지가 전송되므로 필요할 때만 실행한다.

### Swagger 문서

서버 기동 후 브라우저에서 다음 주소로 접속한다.

```
http://localhost:21018/api-docs
```

- 모든 REST API의 요청/응답 스펙을 확인하고 브라우저에서 바로 호출("Try it out")할 수 있다.
- 인증이 필요한 API는 우측 상단 **Authorize** 버튼에 `/auth/login` 응답의 `accessToken` 값을 붙여넣으면 이후 요청에 자동으로 `Authorization: Bearer ...` 헤더가 붙는다.
- WebSocket(`/health`) 인터페이스는 Swagger(REST 전용)로 표현되지 않으므로 [`../docs/API_SPEC.md`](../docs/API_SPEC.md) 2장을 참고한다.
- JSON 스펙 원본: `http://localhost:21018/api-docs-json`

## 2. curl 테스트 스크립트

로그인 → 회원목록 → 회원상세(권한 검증 포함) → 건강데이터 조회 → 채팅까지 한 번에 실행하는 스크립트를 OS별로 제공한다.

### macOS / Linux

```bash
bash test/curl/test-mac.sh
```

- `curl`과 `node`(JSON 파싱용, 프로젝트에 이미 설치되어 있음)만 있으면 동작한다.
- 서버 주소를 바꾸려면 `BASE_URL=http://localhost:21018 bash test/curl/test-mac.sh`.

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File test/curl/test-windows.ps1
```

- PowerShell에서 `curl`은 기본적으로 `Invoke-WebRequest`의 별칭이므로 스크립트는 Windows 10+ 내장 `curl.exe`를 명시적으로 호출한다.
- PowerShell 5.1에서 curl.exe에 JSON 문자열을 직접 넘기면 인용부호가 깨지는 문제가 있어, JSON 본문은 임시 파일에 써서 `curl.exe -d @파일` 형태로 전달한다. 직접 curl 명령을 짤 때도 이 방식을 권장한다.
- 한글이 깨져 보인다면 콘솔 코드페이지 문제다. PowerShell 콘솔에서 `chcp 65001`을 먼저 실행하거나, 스크립트처럼 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`을 사용한다.

### 수동 curl 명령 참고 (OS별 인용부호 차이)

로그인 API를 예로 든다.

**macOS/Linux (bash) — 작은따옴표로 JSON 전체를 감싼다:**

```bash
curl -X POST http://localhost:21018/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"admin","passwd":"admin001123!"}'
```

**Windows (PowerShell) — curl.exe에 문자열로 직접 JSON을 넘기면 인용부호가 깨질 수 있으므로 파일로 전달:**

```powershell
'{"id":"admin","passwd":"admin001123!"}' | Set-Content login.json -Encoding UTF8
curl.exe -X POST http://localhost:21018/auth/login -H "Content-Type: application/json" -d "@login.json"
```

**Windows (cmd.exe) — 큰따옴표를 백슬래시로 escape:**

```cmd
curl -X POST http://localhost:21018/auth/login -H "Content-Type: application/json" -d "{\"id\":\"admin\",\"passwd\":\"admin001123!\"}"
```

## 3. Jest 단위 테스트

DB/외부 서버 없이 순수 로직만 검증한다 (Repository/JwtService 등은 모두 mock).

```bash
npm test              # 전체 단위 테스트 1회 실행
npm run test:watch    # watch 모드
npm run test:cov      # 커버리지 리포트
```

| 파일 | 검증 대상 |
| --- | --- |
| [`test/unit/shared.spec.ts`](./unit/shared.spec.ts) | `shared/types.ts`의 상태 판정 함수(`judgeBloodPressureStatus` 등) |
| [`test/unit/auth.service.spec.ts`](./unit/auth.service.spec.ts) | 로그인 성공/실패, RefreshToken 재발급 성공/실패 |
| [`test/unit/member.service.spec.ts`](./unit/member.service.spec.ts) | 의사/환자 권한별 목록·상세조회 접근제어 |
| `src/app.controller.spec.ts` | Nest 기본 생성 컨트롤러 테스트 (참고용) |

> jest 설정(`package.json`의 `jest` 필드)의 `rootDir`은 프로젝트 루트이며, `*.spec.ts` 파일은 `src/`와 `test/` 어디에 있어도 자동으로 수집된다.

## 4. e2e 테스트 (로그인만)

```bash
npm run test:e2e
```

- [`test/auth.e2e-spec.ts`](./auth.e2e-spec.ts) — 실제 HTTP 요청(`supertest`)으로 `POST /auth/login`, `POST /auth/refresh`를 검증한다. **e2e 테스트 범위는 로그인/재발급으로 한정**했다.
- `AppModule` 전체를 부트스트랩하지 않고, `ConfigModule + TypeOrmModule + AuthModule`만 담은 최소 테스트 모듈을 사용한다. `AppModule`을 그대로 쓰면 `SimulatorClientModule`이 실제 시뮬레이터 서버에 라이브로 접속해버리기 때문이다.
- `.env`의 실제 DB(`211.253.27.76/db18`)에 접속해 시드 계정(`admin`)으로 로그인이 실제로 되는지까지 검증한다. 별도 테스트 DB는 없다.

## 참고

- 백엔드가 제공하는 API 전체 스펙: [`../docs/API_SPEC.md`](../docs/API_SPEC.md)
- 전체 아키텍처: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
