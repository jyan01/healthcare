# health-backend 배포 가이드

> 실제 산출물: [`Dockerfile`](../Dockerfile), [`docker-compose.yml`](../docker-compose.yml), [`.github/workflows/deploy-backend.yml`](../../.github/workflows/deploy-backend.yml).
> 이 문서는 위 3개 파일이 왜 이렇게 구성되었는지, 배포 서버(211.253.10.22)를 여러 학생이 공유할 때 무엇을 지켜야 하는지를 설명한다.

## 1. 전제: 왜 monorepo 루트가 build context여야 하는가

`health-backend/tsconfig.json`은 `rootDir: ".."`, `include`에 `"../shared/**/*.ts"`를 두고 있고, `health-backend/src/shared.ts`는 `export * from '../../shared/types'`로 monorepo 루트의 `shared/`를 참조한다. 즉 **health-backend는 단독으로 빌드되지 않고, 항상 `shared/`와 함께 빌드되어야 한다.**

`npm run build`(nest build) 결과도 이를 반영한다:

```
health-backend/dist/health-backend/src/main.js   ← start:prod가 실행하는 파일
health-backend/dist/shared/...
```

따라서:

- Docker build context는 **monorepo 루트**(`d:/healthcare`)여야 하고, Dockerfile은 `health-backend/`와 `shared/`를 각각 `COPY`한다.
- 배포 서버에도 `health-backend/`와 `shared/`가 **같은 상위 디렉터리 아래 나란히** 있어야 한다. 이 상위 디렉터리가 아래 2장의 "학생별 소스 디렉터리"다.

## 2. 네임스페이스: BACKEND_PORT

배포 서버 한 대(`SERVER_HOST`)를 모든 학생이 공유하므로, **학생마다 고유하게 배정된 `BACKEND_PORT`(GitHub Variable)를 네임스페이스로 사용**해 아래 리소스들이 서로 겹치지 않게 한다.

| 리소스 | 값 | 비고 |
| --- | --- | --- |
| 서버 소스 디렉터리 | `~/deploy/health-backend-${BACKEND_PORT}/` | 그 아래 `health-backend/`, `shared/` 두 폴더가 나란히 위치 |
| Docker Compose 프로젝트명 | `health-backend-${BACKEND_PORT}` | `docker-compose.yml`의 최상위 `name:` |
| Docker 이미지명 | `health-backend-${BACKEND_PORT}:latest` | |
| 컨테이너명 | `health-backend-${BACKEND_PORT}` | |
| 호스트:컨테이너 포트 | `${BACKEND_PORT}:${BACKEND_PORT}` | 컨테이너 내부 `PORT`도 동일한 값 사용 (양쪽 다 BACKEND_PORT로 통일해 관리 포인트를 줄임) |
| Docker volume(로그) | `health-backend-${BACKEND_PORT}_logs` | Compose가 프로젝트명을 자동으로 접두어로 붙여줌 (`docker-compose.yml`에는 `logs`로만 선언) |

`docker compose` 명령을 프로젝트 디렉터리(`.../health-backend/`)에서 실행하면 `docker-compose.yml`의 `name: health-backend-${BACKEND_PORT}`가 프로젝트명이 되고, 이미지·컨테이너·볼륨이 전부 이 이름으로 격리된다. 다른 학생의 컨테이너와 이름이 겹칠 일이 없다.

> Compose 최상위 `name:` 필드는 Docker Compose v2.20+ 필요. 서버의 Compose 버전이 낮다면(`docker compose version`으로 확인) `docker-compose.yml`의 `name:` 줄을 지우고, 모든 `docker compose` 명령 뒤에 `-p health-backend-${BACKEND_PORT}`를 붙이면 동일하게 동작한다.

## 3. 환경변수 매핑 (GitHub Secrets/Variables → 앱이 읽는 .env 키)

앱은 `.env`의 키 이름(`JWT_SECRET`, `PORT` 등)을 그대로 `ConfigService`/`process.env`로 읽는다. 하지만 GitHub Secrets/Variables는 학생별 배포 표준화를 위해 **다른 이름**으로 등록되어 있다. 따라서 `docker-compose.yml`의 `environment:`에서 "GitHub 이름 → 앱 키 이름"으로 명시적으로 매핑한다.

| GitHub 이름 | 종류 | 앱이 읽는 .env 키 | 비고 |
| --- | --- | --- | --- |
| `BACKEND_PORT` | Variable | `PORT` | 컨테이너 리스닝 포트이자 호스트 publish 포트 |
| `DB_HOST` | Variable | `DB_HOST` | 이름 동일 |
| `DB_PORT` | Variable | `DB_PORT` | 이름 동일 |
| `DB_NAME` | Variable | `DB_NAME` | 이름 동일 |
| `DB_USER` | Secret | `DB_USER` | 이름 동일 |
| `DB_PASSWORD` | Secret | `DB_PASSWORD` | 이름 동일 |
| `JWT_ACCESS_SECRET` | Secret | `JWT_SECRET` | **이름 다름** — access token 서명 키 |
| `JWT_REFRESH_SECRET` | Secret | `JWT_REFRESH_SECRET` | 이름 동일 |
| `JWT_ACCESS_TTL_SEC` | Variable | `JWT_EXPIRES_IN` | **이름 다름** — access token 만료 |
| `JWT_REFRESH_TTL_SEC` | Variable | `JWT_REFRESH_EXPIRES_IN` | **이름 다름** — refresh token 만료 |
| `SIMULATOR_URL` | Variable | `SIMULATOR_WS_URL` | **이름 다름** — 시뮬레이터 WebSocket 엔드포인트 |
| `SIMULATOR_RECONNECT_ATTEMPTS` | Variable | `SIMULATOR_RECONNECT_ATTEMPTS` | 현재 앱 코드에서는 미사용(하드코딩된 재연결 로직). 향후 대비해 컨테이너에는 그대로 전달만 해둠 |
| `SIMULATOR_TIMEOUT_MS` | Variable | `SIMULATOR_TIMEOUT_MS` | 위와 동일 |
| `SLACK_WEBHOOK_URL` | Variable | `SLACK_WEBHOOK_URL` | 이름 동일 |
| `CORS_ORIGINS` | Variable | `CORS_ORIGINS` | 이름 동일 — 프론트엔드 오리진(콤마 구분, 예: `https://fe018.ys.iranglab.com,http://localhost:5173`). **스킴(http/https)까지 정확히 일치**해야 브라우저가 CORS를 통과시킨다 |
| `SERVER_HOST` / `SERVER_PORT` | Variable | (해당 없음) | 배포 대상 서버 SSH 접속 정보. 컨테이너 환경변수 아님 |
| `SERVER_USER` / `SSH_KEY` | Secret | (해당 없음) | 배포용 SSH 인증 정보. 컨테이너 환경변수 아님 |

### health-ai(별도 컨테이너) 연동: `AI_AGENT_API_URL`

`AI_AGENT_API_URL`은 고정값이 아니다. health-ai는 이 컨테이너와 **다른 docker compose 프로젝트**로 떠서 같은 네트워크에 속하지 않으므로 `localhost`로는 닿지 않는다. 대신:

- `docker-compose.yml`에 `extra_hosts: ["host.docker.internal:host-gateway"]`를 추가해 컨테이너가 호스트 게이트웨이를 통해 호스트에 publish된 포트로 나갈 수 있게 한다.
- `AI_AGENT_API_URL: "http://host.docker.internal:${AI_API_PORT:?}"`로, health-ai 배포 때 이미 등록한 `AI_API_PORT`(Variable)를 **그대로 재사용**한다 (health-backend용으로 새로 등록하지 않는다).
- workflow의 `env:`/`envs:`에도 `AI_API_PORT`를 추가해야 SSH 세션에 값이 주입된다.

### GitHub Secrets/Variables에 없는 값 → `.env` 값을 고정으로 사용

아래 값들은 GitHub에 등록되어 있지 않으므로, 현재 `health-backend/.env`에 있는 값을 `docker-compose.yml`에 **하드코딩**한다 (학생마다 달라질 필요가 없는 값들):

| 키 | 고정값 |
| --- | --- |
| `LOG_DIR` | `./logs` |
| `LOG_RETENTION_DAYS` | `7` |
| `HEALTH_DATA_RETENTION_DAYS` | `7` |

> 이 값들을 나중에 학생별로 달리 가져가야 한다면, GitHub Variable로 새로 등록하고 `docker-compose.yml`의 해당 줄만 `${VAR}`로 바꾸면 된다.

## 4. 배포 흐름

1. **GitHub Actions 트리거**: `main` 브랜치에 `health-backend/**` 또는 `shared/**` 변경이 push되거나, 수동 실행(`workflow_dispatch`).
2. **rsync 업로드**: `health-backend/`와 `shared/`를 각각 서버의 `~/deploy/health-backend-${BACKEND_PORT}/health-backend/`, `~/deploy/health-backend-${BACKEND_PORT}/shared/`로 업로드 (`--delete`로 서버 쪽 잔여 파일 정리). 두 폴더가 나란히 있어야 1장에서 설명한 build context 요구사항이 충족된다.
3. **SSH 원격 실행**: 서버에 접속해 `health-backend/` 디렉터리에서 `docker compose up -d --build` 실행. 이때 GitHub Secrets/Variables 값이 SSH 세션의 환경변수로 주입되고, `docker-compose.yml`의 `${VAR}` 치환에 사용된다. **`.env` 파일은 서버에 생성되지 않는다.**
4. `docker image prune -f`로 이전 빌드가 남긴 dangling 이미지 정리.

## 5. 파일별 설명

### `Dockerfile`

4-스테이지 빌드:

1. `deps` — `health-backend/package.json`만으로 `npm ci` (dev 의존성 포함, `nest build`에 필요).
2. `build` — `health-backend/`와 `shared/`를 함께 COPY 후 `npm run build`.
3. `prod-deps` — `npm ci --omit=dev`로 런타임 전용 의존성만 별도 설치 (최종 이미지 용량 절감).
4. 최종 런타임 — `node:20-alpine` 위에 `node_modules`(prod-deps), `dist`(build), `package.json`만 복사. `CMD ["node", "dist/health-backend/src/main.js"]`.

빌드는 반드시 monorepo 루트를 context로 해야 한다:

```bash
# 로컬 테스트 (monorepo 루트에서 실행)
docker build -f health-backend/Dockerfile -t health-backend-test .
```

### `docker-compose.yml`

- `health-backend/` 안에 위치하므로 `build.context: ..`가 monorepo 루트를 가리킨다.
- 3장의 매핑표대로 `environment:`에서 GitHub 이름 → 앱 키 이름을 변환한다.
- 모든 필수 변수는 `${VAR:?...}` 문법으로 선언되어, 셸에 값이 없으면 명확한 에러와 함께 즉시 실패한다 (silent하게 빈 값으로 뜨는 것을 방지).
- `logs` 볼륨은 winston 로그(`LOG_DIR=./logs`)를 컨테이너 재생성 후에도 보존한다.

로컬/서버에서 수동으로 띄워볼 때는 필요한 환경변수를 셸에 export한 뒤 실행한다:

```bash
cd health-backend
export BACKEND_PORT=21018 DB_HOST=... DB_PORT=5432 DB_NAME=... DB_USER=... DB_PASSWORD=...
export JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... JWT_ACCESS_TTL_SEC=3600 JWT_REFRESH_TTL_SEC=1209600
export SIMULATOR_URL=wss://healthsim.iranglab.com/simulator
export SIMULATOR_RECONNECT_ATTEMPTS=5 SIMULATOR_TIMEOUT_MS=5000
export SLACK_WEBHOOK_URL=https://hooks.slack.com/...
docker compose up -d --build
```

### `.github/workflows/deploy-backend.yml`

- Job 레벨 `env:`에 GitHub Secrets/Variables를 **GitHub 이름 그대로** 담아둔다 (이 값들이 `docker-compose.yml`의 `${VAR}` 치환 소스가 된다).
- rsync는 원격지에 없는 상위 디렉터리를 자동으로 만들어주지 않으므로, 업로드 전에 `appleboy/ssh-action`으로 `mkdir -p ~/deploy/health-backend-$BACKEND_PORT/{health-backend,shared}`를 먼저 실행해 디렉터리를 만들어둔다.
- `burnett01/rsync-deployments`로 `health-backend/`, `shared/`를 각각 서버에 업로드.
- `appleboy/ssh-action`의 `envs:`로 필요한 환경변수 이름만 넘겨 원격 셸에 안전하게 주입한 뒤(`script:`에 직접 문자열 치환하지 않음), `docker compose up -d --build`를 실행.

### `.dockerignore` (monorepo 루트)

Build context가 monorepo 루트 전체가 되므로, `health-web`/`health-mobile`/`health-ai`/`demo` 등 이 배포와 무관한 디렉터리와 `node_modules`/`dist`/`.git`을 제외해 빌드 컨텍스트 전송 시간을 줄인다. (실제로 이미지에 들어가는지 여부는 Dockerfile의 `COPY` 대상으로 결정되며, `.dockerignore`는 어디까지나 최적화용이다.)

## 6. 서버 사전 준비 (최초 1회, 학생별)

- 서버에 `~/deploy/` 디렉터리는 워크플로의 "Ensure remote directories exist" 스텝이 최초 실행 시 자동으로 만들어준다 (rsync 자체는 없는 상위 디렉터리를 만들어주지 않음).
- 서버에 Docker Engine + Docker Compose v2 설치, 현재 SSH 계정이 `docker` 그룹에 속해 `sudo` 없이 `docker` 명령 실행 가능해야 함.
- `SSH_KEY`(Secret)에 대응하는 공개키가 서버 `~/.ssh/authorized_keys`에 등록되어 있어야 함.
- `BACKEND_PORT`로 배정된 포트가 서버 방화벽에서 열려 있어야 함.
- **[고도화]** `sleep` 테이블이 DB에 없다면 최초 1회 [`docs/sleep-table.sql`](./sleep-table.sql)을 공유 DB에 실행해야 함(`synchronize: false`라 TypeORM이 자동 생성하지 않음). 실행 전에는 수면 데이터 수신 시 저장이 실패한다.

## 7. 트러블슈팅

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| `docker build`에서 `Cannot find module '../../shared/types'` 류 에러 | build context가 monorepo 루트가 아니거나, 서버에 `shared/`가 업로드되지 않음 | `docker-compose.yml`의 `build.context`가 `..`인지, 서버 `~/deploy/health-backend-${BACKEND_PORT}/` 아래 `shared/`가 있는지 확인 |
| `docker compose up`이 `variable is required` 에러로 즉시 실패 | 필요한 환경변수가 셸/SSH 세션에 export되지 않음 | GitHub Secrets/Variables 등록 여부 및 workflow `env:`/`envs:` 목록 확인 |
| 다른 학생의 컨테이너가 갑자기 내려감/충돌 | `BACKEND_PORT`가 중복 배정되었거나 네임스페이스 없이 명령을 실행 | `BACKEND_PORT` 배정 대장 확인, 항상 프로젝트 디렉터리(`.../health-backend/`)에서만 `docker compose` 실행 |
| Slack 알림이 오지 않음 | `SLACK_WEBHOOK_URL`이 컨테이너에 전달되지 않음 | `docker exec <container> printenv SLACK_WEBHOOK_URL`로 값 확인 |
| `/chat`, `/members/:id/ai-summary` 호출 시 500 | `AI_AGENT_API_URL`이 health-ai 컨테이너에 닿지 않음 (health-ai가 안 떠 있거나, `AI_API_PORT`가 워크플로 env에 빠졌거나, `extra_hosts` 누락) | health-ai 컨테이너가 떠 있는지(`docker ps`), `docker exec <backend 컨테이너> printenv AI_AGENT_API_URL`로 값 확인, `docker exec <backend 컨테이너> curl http://host.docker.internal:$AI_API_PORT/`로 연결 확인 |
| rsync 스텝에서 `mkdir "...health-backend" failed: No such file or directory` | 서버에 `~/deploy/health-backend-${BACKEND_PORT}/` 상위 경로가 아직 없는데 rsync가 여러 단계 디렉터리를 한 번에 못 만듦 | "Ensure remote directories exist" 스텝(mkdir -p)이 upload 스텝보다 먼저 실행되는지 워크플로 순서 확인 |
